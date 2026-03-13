import Redis from "ioredis";
import { makeId } from "@/lib/utils/id";
import { addSecondsToIso, isExpired, nowIso } from "@/lib/utils/time";
import type {
  Artifact,
  ClaimTaskInput,
  ContextAccessMode,
  ContextBundle,
  CreateTaskEventInput,
  CreateTaskInput,
  SaveArtifactInput,
  TaskEvent,
  TaskRecord,
  UpdateTaskInput,
} from "@/lib/types/task";
import type { Store } from "@/lib/store/types";

const DEFAULT_LEASE_SECONDS = 30 * 60;
const DEFAULT_SUMMARY = "\u6682\u65e0\u6458\u8981\u3002";
const TASK_NOT_FOUND = "\u4efb\u52a1\u4e0d\u5b58\u5728\u3002";

export class RedisStore implements Store {
  constructor(
    private redis: Redis,
    private retentionSeconds: number,
  ) {}

  private taskKey(taskId: string) {
    return `task:${taskId}`;
  }

  private artifactKey(artifactId: string) {
    return `artifact:${artifactId}`;
  }

  private artifactsIndexKey(taskId: string) {
    return `task:${taskId}:artifacts`;
  }

  private eventsIndexKey(taskId: string) {
    return `task:${taskId}:events`;
  }

  private eventKey(eventId: string) {
    return `event:${eventId}`;
  }

  private nextExpiresAt() {
    return addSecondsToIso(this.retentionSeconds);
  }

  private isLeaseActive(task: TaskRecord) {
    return Boolean(task.claimedBy && task.leaseExpiresAt && !isExpired(task.leaseExpiresAt));
  }

  private getTaskOwnerActors(task: TaskRecord) {
    return [task.assignedAgent, task.claimedBy].filter((value): value is string => Boolean(value));
  }

  private async getAccessMode(task: TaskRecord, actor: string): Promise<ContextAccessMode> {
    if (!actor || actor === "root") {
      return "full";
    }

    if (task.visibility === "shared") {
      return "full";
    }

    if (this.getTaskOwnerActors(task).includes(actor)) {
      return "full";
    }

    if (task.visibility === "parent" && task.parentTaskId) {
      const parentTask = await this.getTask(task.parentTaskId);
      if (parentTask && this.getTaskOwnerActors(parentTask).includes(actor)) {
        return "full";
      }
    }

    return "summary_only";
  }

  private async readJson<T>(key: string) {
    const payload = await this.redis.get(key);
    return payload ? (JSON.parse(payload) as T) : null;
  }

  private async readIndexedJson<T>(ids: string[], toKey: (id: string) => string) {
    if (ids.length === 0) {
      return [];
    }

    const pipeline = this.redis.pipeline();
    for (const id of ids) {
      pipeline.get(toKey(id));
    }

    const rows = await pipeline.exec();
    return (rows ?? [])
      .flatMap((entry) => {
        const payload = entry?.[1];
        if (typeof payload !== "string") {
          return [];
        }

        try {
          return [JSON.parse(payload) as T];
        } catch {
          return [];
        }
      });
  }

  async listTasks() {
    const taskIds = await this.redis.lrange("tasks:index", 0, -1);
    const tasks = await this.readIndexedJson<TaskRecord>(taskIds, (taskId) => this.taskKey(taskId));
    return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(taskId: string) {
    return this.readJson<TaskRecord>(this.taskKey(taskId));
  }

  async createTask(input: CreateTaskInput) {
    const timestamp = nowIso();
    const task: TaskRecord = {
      taskId: makeId("task"),
      title: input.title,
      status: "pending",
      summary: input.summary?.trim() || DEFAULT_SUMMARY,
      resultSummary: input.resultSummary?.trim(),
      parentTaskId: input.parentTaskId,
      assignedAgent: input.assignedAgent,
      visibility: input.visibility ?? "private",
      inputRefs: input.inputRefs ?? [],
      outputRefs: [],
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis
      .multi()
      .set(this.taskKey(task.taskId), JSON.stringify(task), "EX", this.retentionSeconds)
      .lpush("tasks:index", task.taskId)
      .expire("tasks:index", this.retentionSeconds)
      .exec();

    return task;
  }

  async updateTask(taskId: string, input: UpdateTaskInput) {
    const current = await this.getTask(taskId);
    if (!current) {
      return null;
    }

    const next: TaskRecord = {
      ...current,
      ...input,
      summary: input.summary?.trim() || current.summary || DEFAULT_SUMMARY,
      inputRefs: input.inputRefs ?? current.inputRefs,
      outputRefs: input.outputRefs ?? current.outputRefs,
      tags: input.tags ?? current.tags,
      updatedAt: nowIso(),
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis.set(this.taskKey(taskId), JSON.stringify(next), "EX", this.retentionSeconds);
    return next;
  }

  async claimTask(taskId: string, input: ClaimTaskInput) {
    const current = await this.getTask(taskId);
    if (!current) {
      return null;
    }

    if (this.isLeaseActive(current) && current.claimedBy !== input.actor) {
      throw new Error(`\u4efb\u52a1\u5df2\u88ab ${current.claimedBy} \u9886\u53d6\u3002`);
    }

    const claimedAt = nowIso();
    const next: TaskRecord = {
      ...current,
      claimedBy: input.actor,
      claimedAt,
      leaseExpiresAt: addSecondsToIso(input.leaseSeconds ?? DEFAULT_LEASE_SECONDS),
      updatedAt: claimedAt,
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis.set(this.taskKey(taskId), JSON.stringify(next), "EX", this.retentionSeconds);
    return next;
  }

  async releaseTask(taskId: string, actor?: string) {
    const current = await this.getTask(taskId);
    if (!current) {
      return null;
    }

    if (actor && current.claimedBy && current.claimedBy !== actor) {
      throw new Error(`\u4efb\u52a1\u5f53\u524d\u7531 ${current.claimedBy} \u6301\u6709\uff0c\u65e0\u6cd5\u7531 ${actor} \u91ca\u653e\u3002`);
    }

    const next: TaskRecord = {
      ...current,
      claimedBy: undefined,
      claimedAt: undefined,
      leaseExpiresAt: undefined,
      updatedAt: nowIso(),
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis.set(this.taskKey(taskId), JSON.stringify(next), "EX", this.retentionSeconds);
    return next;
  }

  async saveArtifact(taskId: string, input: SaveArtifactInput) {
    const current = await this.getTask(taskId);
    if (!current) {
      throw new Error(TASK_NOT_FOUND);
    }

    const timestamp = nowIso();
    const artifactId = makeId("artifact");
    const artifact: Artifact = {
      artifactId,
      taskId,
      type: input.type ?? "note",
      content: input.content,
      summary: input.summary,
      sourceAgent: input.sourceAgent,
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    };

    const nextTask: TaskRecord = {
      ...current,
      detailRef: artifactId,
      outputRefs: Array.from(new Set([...(current.outputRefs ?? []), artifactId])),
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis
      .multi()
      .set(this.artifactKey(artifactId), JSON.stringify(artifact), "EX", this.retentionSeconds)
      .lpush(this.artifactsIndexKey(taskId), artifactId)
      .expire(this.artifactsIndexKey(taskId), this.retentionSeconds)
      .set(this.taskKey(taskId), JSON.stringify(nextTask), "EX", this.retentionSeconds)
      .exec();

    return artifact;
  }

  async getArtifact(artifactId: string) {
    return this.readJson<Artifact>(this.artifactKey(artifactId));
  }

  async listArtifactsForTask(taskId: string) {
    const artifactIds = await this.redis.lrange(this.artifactsIndexKey(taskId), 0, -1);
    const artifacts = await this.readIndexedJson<Artifact>(artifactIds, (artifactId) => this.artifactKey(artifactId));
    return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async appendTaskEvent(taskId: string, input: CreateTaskEventInput) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(TASK_NOT_FOUND);
    }

    const event: TaskEvent = {
      eventId: makeId("event"),
      taskId,
      type: input.type,
      actor: input.actor,
      message: input.message,
      metadata: input.metadata,
      createdAt: nowIso(),
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis
      .multi()
      .set(this.eventKey(event.eventId), JSON.stringify(event), "EX", this.retentionSeconds)
      .lpush(this.eventsIndexKey(taskId), event.eventId)
      .expire(this.eventsIndexKey(taskId), this.retentionSeconds)
      .set(
        this.taskKey(taskId),
        JSON.stringify({ ...task, updatedAt: nowIso(), expiresAt: this.nextExpiresAt() } satisfies TaskRecord),
        "EX",
        this.retentionSeconds,
      )
      .exec();

    return event;
  }

  async listTaskEvents(taskId: string) {
    const eventIds = await this.redis.lrange(this.eventsIndexKey(taskId), 0, -1);
    return this.readIndexedJson<TaskEvent>(eventIds, (eventId) => this.eventKey(eventId));
  }

  async getContextBundle(taskId: string, actor = "root") {
    const task = await this.getTask(taskId);
    if (!task) {
      return null;
    }

    const access = await this.getAccessMode(task, actor);
    const refs = Array.from(
      new Set([...(task.inputRefs ?? []), ...(task.outputRefs ?? []), ...(task.detailRef ? [task.detailRef] : [])]),
    );
    const artifacts = await Promise.all(refs.map((ref) => this.getArtifact(ref)));
    const normalizedArtifacts = artifacts.filter((artifact): artifact is Artifact => Boolean(artifact));
    const inputArtifacts =
      access === "full" ? normalizedArtifacts.filter((artifact) => task.inputRefs.includes(artifact.artifactId)) : [];
    const outputArtifacts =
      access === "full" ? normalizedArtifacts.filter((artifact) => task.outputRefs.includes(artifact.artifactId)) : [];
    const recentEvents = (await this.listTaskEvents(taskId)).slice(0, 10);

    return {
      task,
      inputArtifacts,
      outputArtifacts,
      recentEvents,
      guidance: {
        mode: "summary_first",
        summary: task.summary,
        visibility: task.visibility,
        suggestedRefs: access === "full" ? (task.inputRefs.length > 0 ? task.inputRefs : task.outputRefs) : [],
        actor,
        access,
      },
    } satisfies ContextBundle;
  }
}
