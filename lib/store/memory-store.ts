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

export class MemoryStore implements Store {
  private tasks = new Map<string, TaskRecord>();
  private artifacts = new Map<string, Artifact>();
  private taskArtifacts = new Map<string, string[]>();
  private taskEvents = new Map<string, TaskEvent[]>();

  constructor(private retentionSeconds: number) {}

  private nextExpiresAt() {
    return addSecondsToIso(this.retentionSeconds);
  }

  private isLeaseActive(task: TaskRecord) {
    return Boolean(task.claimedBy && task.leaseExpiresAt && !isExpired(task.leaseExpiresAt));
  }

  private getTaskOwnerActors(task: TaskRecord) {
    return [task.assignedAgent, task.claimedBy].filter((value): value is string => Boolean(value));
  }

  private getAccessMode(task: TaskRecord, actor: string): ContextAccessMode {
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
      const parentTask = this.tasks.get(task.parentTaskId);
      if (parentTask && this.getTaskOwnerActors(parentTask).includes(actor)) {
        return "full";
      }
    }

    return "summary_only";
  }

  private cleanupExpired() {
    const now = Date.now();

    for (const [taskId, task] of this.tasks) {
      if (isExpired(task.expiresAt, now)) {
        this.tasks.delete(taskId);
        this.taskArtifacts.delete(taskId);
        this.taskEvents.delete(taskId);
      }
    }

    for (const [artifactId, artifact] of this.artifacts) {
      if (isExpired(artifact.expiresAt, now)) {
        this.artifacts.delete(artifactId);
      }
    }

    for (const [taskId, events] of this.taskEvents) {
      this.taskEvents.set(
        taskId,
        events.filter((event) => !isExpired(event.expiresAt, now)),
      );
    }

    for (const [taskId, artifactIds] of this.taskArtifacts) {
      this.taskArtifacts.set(
        taskId,
        artifactIds.filter((artifactId) => {
          const artifact = this.artifacts.get(artifactId);
          return artifact ? !isExpired(artifact.expiresAt, now) : false;
        }),
      );
    }
  }

  async listTasks() {
    this.cleanupExpired();
    return [...this.tasks.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(taskId: string) {
    this.cleanupExpired();
    return this.tasks.get(taskId) ?? null;
  }

  async createTask(input: CreateTaskInput) {
    this.cleanupExpired();
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

    this.tasks.set(task.taskId, task);
    this.taskArtifacts.set(task.taskId, []);
    this.taskEvents.set(task.taskId, []);
    return task;
  }

  async updateTask(taskId: string, input: UpdateTaskInput) {
    this.cleanupExpired();
    const current = this.tasks.get(taskId);
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

    this.tasks.set(taskId, next);
    return next;
  }

  async claimTask(taskId: string, input: ClaimTaskInput) {
    this.cleanupExpired();
    const current = this.tasks.get(taskId);
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

    this.tasks.set(taskId, next);
    return next;
  }

  async releaseTask(taskId: string, actor?: string) {
    this.cleanupExpired();
    const current = this.tasks.get(taskId);
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

    this.tasks.set(taskId, next);
    return next;
  }

  async saveArtifact(taskId: string, input: SaveArtifactInput) {
    this.cleanupExpired();
    const current = this.tasks.get(taskId);
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

    this.artifacts.set(artifactId, artifact);
    this.taskArtifacts.set(taskId, [...(this.taskArtifacts.get(taskId) ?? []), artifactId]);
    this.tasks.set(taskId, {
      ...current,
      detailRef: artifactId,
      outputRefs: Array.from(new Set([...(current.outputRefs ?? []), artifactId])),
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    });

    return artifact;
  }

  async getArtifact(artifactId: string) {
    this.cleanupExpired();
    return this.artifacts.get(artifactId) ?? null;
  }

  async listArtifactsForTask(taskId: string) {
    this.cleanupExpired();
    const artifactIds = this.taskArtifacts.get(taskId) ?? [];
    return artifactIds
      .map((artifactId) => this.artifacts.get(artifactId))
      .filter((artifact): artifact is Artifact => Boolean(artifact))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async appendTaskEvent(taskId: string, input: CreateTaskEventInput) {
    this.cleanupExpired();
    const task = this.tasks.get(taskId);
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

    const events = this.taskEvents.get(taskId) ?? [];
    this.taskEvents.set(taskId, [event, ...events]);
    this.tasks.set(taskId, { ...task, updatedAt: nowIso(), expiresAt: this.nextExpiresAt() });
    return event;
  }

  async listTaskEvents(taskId: string) {
    this.cleanupExpired();
    return [...(this.taskEvents.get(taskId) ?? [])];
  }

  async getContextBundle(taskId: string, actor = "root") {
    this.cleanupExpired();
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const access = this.getAccessMode(task, actor);
    const refs = Array.from(
      new Set([...(task.inputRefs ?? []), ...(task.outputRefs ?? []), ...(task.detailRef ? [task.detailRef] : [])]),
    );
    const artifacts = refs
      .map((ref) => this.artifacts.get(ref))
      .filter((artifact): artifact is Artifact => Boolean(artifact));
    const inputArtifacts = access === "full" ? artifacts.filter((artifact) => task.inputRefs.includes(artifact.artifactId)) : [];
    const outputArtifacts = access === "full" ? artifacts.filter((artifact) => task.outputRefs.includes(artifact.artifactId)) : [];

    return {
      task,
      inputArtifacts,
      outputArtifacts,
      recentEvents: (this.taskEvents.get(taskId) ?? []).slice(0, 10),
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
