import Redis from "ioredis";
import { makeId } from "@/lib/utils/id";
import { addSecondsToIso, isExpired, nowIso } from "@/lib/utils/time";
import type {
  AgentEvent,
  AgentRecord,
  Artifact,
  BatchRequest,
  BatchResult,
  ClaimTaskInput,
  ContextAccessMode,
  ContextBundle,
  CreateAgentEventInput,
  CreateTaskEventInput,
  CreateTaskInput,
  DependenciesResponse,
  SaveArtifactInput,
  SubAgent,
  TaskEvent,
  TaskFilters,
  TaskListOptions,
  TaskListResponse,
  TaskRecord,
  TaskStats,
  TaskStatus,
  UpdateAgentInput,
  UpdateTaskInput,
} from "@/lib/types/task";
import type { Store } from "@/lib/store/types";

const DEFAULT_LEASE_SECONDS = 30 * 60;
const AGENT_TIMEOUT_SECONDS = 5 * 60; // 5 minutes timeout
const DEFAULT_SUMMARY = "暂无摘要。";
const TASK_NOT_FOUND = "任务不存在。";

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

  // Task keys
  private tasksIndexKey() {
    return "tasks:index";
  }

  private async listTaskIdsFromIndex() {
    const key = this.tasksIndexKey();
    const indexType = await this.redis.type(key);
    if (indexType === "set") {
      return this.redis.smembers(key);
    }
    if (indexType === "list") {
      return this.redis.lrange(key, 0, -1);
    }
    return [];
  }

  private async addTaskIdToIndex(taskId: string) {
    const key = this.tasksIndexKey();
    const indexType = await this.redis.type(key);
    if (indexType === "set") {
      await this.redis.sadd(key, taskId);
    } else {
      await this.redis.lpush(key, taskId);
    }
    await this.redis.expire(key, this.retentionSeconds);
  }

  private async removeTaskIdFromIndex(taskId: string) {
    const key = this.tasksIndexKey();
    const indexType = await this.redis.type(key);
    if (indexType === "set") {
      await this.redis.srem(key, taskId);
      return;
    }
    if (indexType === "list") {
      await this.redis.lrem(key, 0, taskId);
    }
  }

  // Agent keys
  private agentKey(agentId: string) {
    return `agent:${agentId}`;
  }

  private agentsIndexKey() {
    return "agents:index";
  }

  private agentEventsIndexKey() {
    return "agents:events:index";
  }

  private agentEventKey(eventId: string) {
    return `agent:event:${eventId}`;
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
    const taskIds = await this.listTaskIdsFromIndex();
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
      subagent: input.subagent,
      visibility: input.visibility ?? "private",
      inputRefs: input.inputRefs ?? [],
      outputRefs: [],
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis.set(this.taskKey(task.taskId), JSON.stringify(task), "EX", this.retentionSeconds);
    await this.addTaskIdToIndex(task.taskId);

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
      throw new Error(`任务已被 ${current.claimedBy} 领取。`);
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

    // Allow root or no actor (force release) to release any task
    if (actor && actor !== "root" && current.claimedBy && current.claimedBy !== actor) {
      throw new Error(`任务当前由 ${current.claimedBy} 持有，无法由 ${actor} 释放。`);
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

  async deleteTask(taskId: string): Promise<boolean> {
    const exists = await this.redis.exists(this.taskKey(taskId));
    if (!exists) {
      return false;
    }

    await this.redis.del(this.taskKey(taskId));
    await this.removeTaskIdFromIndex(taskId);
    await this.redis.del(this.artifactsIndexKey(taskId));
    await this.redis.del(this.eventsIndexKey(taskId));
    return true;
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

  // Agent operations

  async registerAgent(agentId: string, name: string, parentAgentId?: string, sessionId?: string): Promise<AgentRecord> {
    const timestamp = nowIso();
    const agent: AgentRecord = {
      agentId,
      parentAgentId,
      name,
      status: "idle",
      sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastHeartbeatAt: timestamp,
      expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
    };

    await this.redis
      .multi()
      .set(this.agentKey(agentId), JSON.stringify(agent), "EX", AGENT_TIMEOUT_SECONDS)
      .sadd(this.agentsIndexKey(), agentId)
      .exec();

    return agent;
  }

  async updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentRecord | null> {
    const current = await this.readJson<AgentRecord>(this.agentKey(agentId));
    if (!current) {
      return null;
    }

    const next: AgentRecord = {
      ...current,
      ...input,
      updatedAt: nowIso(),
      lastHeartbeatAt: nowIso(),
      expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
    };

    await this.redis.set(this.agentKey(agentId), JSON.stringify(next), "EX", AGENT_TIMEOUT_SECONDS);
    return next;
  }

  async getAgent(agentId: string): Promise<AgentRecord | null> {
    const agent = await this.readJson<AgentRecord>(this.agentKey(agentId));
    if (!agent) {
      return null;
    }

    // Check if agent has timed out
    if (isExpired(agent.expiresAt)) {
      await this.redis.del(this.agentKey(agentId));
      await this.redis.srem(this.agentsIndexKey(), agentId);
      return null;
    }

    return agent;
  }

  async listAgents(): Promise<AgentRecord[]> {
    const agentIds = await this.redis.smembers(this.agentsIndexKey());
    const agents: AgentRecord[] = [];
    const now = Date.now();

    for (const agentId of agentIds) {
      const agent = await this.readJson<AgentRecord>(this.agentKey(agentId));
      if (!agent) {
        await this.redis.srem(this.agentsIndexKey(), agentId);
        continue;
      }

      if (!isExpired(agent.expiresAt, now)) {
        agents.push(agent);
      } else {
        await this.redis.del(this.agentKey(agentId));
        await this.redis.srem(this.agentsIndexKey(), agentId);
      }
    }

    return agents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async heartbeatAgent(agentId: string): Promise<AgentRecord | null> {
    const current = await this.readJson<AgentRecord>(this.agentKey(agentId));
    if (!current) {
      return null;
    }

    const next: AgentRecord = {
      ...current,
      updatedAt: nowIso(),
      lastHeartbeatAt: nowIso(),
      expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
    };

    await this.redis.set(this.agentKey(agentId), JSON.stringify(next), "EX", AGENT_TIMEOUT_SECONDS);
    return next;
  }

  async removeAgent(agentId: string): Promise<boolean> {
    const result = await this.redis.del(this.agentKey(agentId));
    await this.redis.srem(this.agentsIndexKey(), agentId);
    return result > 0;
  }

  async appendAgentEvent(input: CreateAgentEventInput): Promise<AgentEvent> {
    const event: AgentEvent = {
      eventId: makeId("agevt"),
      agentId: input.agentId,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
      createdAt: nowIso(),
      expiresAt: this.nextExpiresAt(),
    };

    await this.redis
      .multi()
      .set(this.agentEventKey(event.eventId), JSON.stringify(event), "EX", this.retentionSeconds)
      .lpush(this.agentEventsIndexKey(), event.eventId)
      .expire(this.agentEventsIndexKey(), this.retentionSeconds)
      .exec();

    // Also update the agent's lastHeartbeatAt
    const agent = await this.readJson<AgentRecord>(this.agentKey(input.agentId));
    if (agent) {
      const updatedAgent: AgentRecord = {
        ...agent,
        updatedAt: nowIso(),
        lastHeartbeatAt: nowIso(),
        expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
      };
      await this.redis.set(this.agentKey(input.agentId), JSON.stringify(updatedAgent), "EX", AGENT_TIMEOUT_SECONDS);
    }

    return event;
  }

  async listAgentEvents(agentId?: string): Promise<AgentEvent[]> {
    const eventIds = await this.redis.lrange(this.agentEventsIndexKey(), 0, -1);
    const events = await this.readIndexedJson<AgentEvent>(eventIds, (eventId) => this.agentEventKey(eventId));
    
    if (agentId) {
      return events.filter((event) => event.agentId === agentId);
    }
    
    return events;
  }

  // ========== SubAgent CRUD ==========

  private subAgentKey(id: string): string {
    return `subagent:${id}`;
  }

  private subAgentsIndexKey(): string {
    return "subagents:index";
  }

  async createSubAgent(input: {
    parentAgent: string;
    name: string;
    description?: string;
    tags?: string[];
  }): Promise<SubAgent> {
    const now = nowIso();
    const id = makeId("sub");
    const subAgent: SubAgent = {
      id,
      parentAgent: input.parentAgent,
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(this.subAgentKey(id), JSON.stringify(subAgent));
    await this.redis.sadd(this.subAgentsIndexKey(), id);
    return subAgent;
  }

  async getSubAgent(id: string): Promise<SubAgent | null> {
    const data = await this.redis.get(this.subAgentKey(id));
    return data ? JSON.parse(data) : null;
  }

  async listSubAgents(parentAgent?: string): Promise<SubAgent[]> {
    const ids = await this.redis.smembers(this.subAgentsIndexKey());
    const subAgents: SubAgent[] = [];
    for (const id of ids) {
      const subAgent = await this.getSubAgent(id);
      if (subAgent && (!parentAgent || subAgent.parentAgent === parentAgent)) {
        subAgents.push(subAgent);
      }
    }
    return subAgents;
  }

  async updateSubAgent(
    id: string,
    input: {
      name?: string;
      description?: string;
      tags?: string[];
      enabled?: boolean;
    }
  ): Promise<SubAgent | null> {
    const current = await this.getSubAgent(id);
    if (!current) {
      return null;
    }
    const updated: SubAgent = {
      ...current,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      tags: input.tags ?? current.tags,
      enabled: input.enabled ?? current.enabled,
      updatedAt: nowIso(),
    };
    await this.redis.set(this.subAgentKey(id), JSON.stringify(updated));
    return updated;
  }

  async deleteSubAgent(id: string): Promise<boolean> {
    const result = await this.redis.del(this.subAgentKey(id));
    await this.redis.srem(this.subAgentsIndexKey(), id);
    return result > 0;
  }

  // ========== Task Filtering ==========
  async listTasksWithFilters(options: TaskListOptions): Promise<TaskListResponse> {
    const { filters, page = 1, limit = 20 } = options;
    
    // Get all task IDs
    const taskIds = await this.listTaskIdsFromIndex();
    const tasks: TaskRecord[] = [];

    for (const taskId of taskIds) {
      const task = await this.readJson<TaskRecord>(this.taskKey(taskId));
      if (!task || isExpired(task.expiresAt)) {
        continue;
      }

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(task.status)) continue;
      }

      if (filters.agent) {
        if (task.assignedAgent !== filters.agent && task.claimedBy !== filters.agent) continue;
      }

      if (filters.from) {
        const fromDate = new Date(filters.from);
        if (new Date(task.createdAt) < fromDate) continue;
      }

      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(task.createdAt) > toDate) continue;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!task.title.toLowerCase().includes(searchLower) && 
            !task.summary.toLowerCase().includes(searchLower)) continue;
      }

      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some(tag => task.tags.includes(tag))) continue;
      }

      if (filters.parentTaskId) {
        if (task.parentTaskId !== filters.parentTaskId) continue;
      }

      tasks.push(task);
    }

    // Sort by updatedAt descending
    tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = tasks.length;
    const start = (page - 1) * limit;
    const paginatedTasks = tasks.slice(start, start + limit);

    return {
      tasks: paginatedTasks,
      total,
      page,
      limit,
      filters,
    };
  }

  // ========== Batch Operations ==========
  async batchUpdate(request: BatchRequest): Promise<BatchResult> {
    const success: string[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];

    for (const taskId of request.taskIds) {
      try {
        const task = await this.readJson<TaskRecord>(this.taskKey(taskId));
        if (!task) {
          failed.push({ taskId, error: TASK_NOT_FOUND });
          continue;
        }

        switch (request.action) {
          case "update_status":
            if (!request.payload?.status) {
              failed.push({ taskId, error: "缺少 status 参数" });
              continue;
            }
            await this.updateTask(taskId, { status: request.payload.status });
            success.push(taskId);
            break;

          case "delete":
            await this.redis.del(this.taskKey(taskId));
            await this.removeTaskIdFromIndex(taskId);
            await this.redis.del(this.artifactsIndexKey(taskId));
            await this.redis.del(this.eventsIndexKey(taskId));
            success.push(taskId);
            break;

          case "assign_agent":
            if (!request.payload?.agent) {
              failed.push({ taskId, error: "缺少 agent 参数" });
              continue;
            }
            await this.updateTask(taskId, { assignedAgent: request.payload.agent });
            success.push(taskId);
            break;

          case "add_tags":
            if (!request.payload?.tags || request.payload.tags.length === 0) {
              failed.push({ taskId, error: "缺少 tags 参数" });
              continue;
            }
            const currentTags = task.tags || [];
            await this.updateTask(taskId, { 
              tags: [...new Set([...currentTags, ...request.payload.tags])] 
            });
            success.push(taskId);
            break;

          case "remove_tags":
            if (!request.payload?.tags || request.payload.tags.length === 0) {
              failed.push({ taskId, error: "缺少 tags 参数" });
              continue;
            }
            const existingTags = task.tags || [];
            await this.updateTask(taskId, { 
              tags: existingTags.filter(tag => !request.payload!.tags!.includes(tag)) 
            });
            success.push(taskId);
            break;

          default:
            failed.push({ taskId, error: "未知操作类型" });
        }
      } catch (error) {
        failed.push({ 
          taskId, 
          error: error instanceof Error ? error.message : "未知错误" 
        });
      }
    }

    return { success, failed };
  }

  // ========== Statistics ==========
  async getStats(filters: TaskFilters): Promise<TaskStats> {
    try {
      const taskIds = await this.listTaskIdsFromIndex();
      const tasks: TaskRecord[] = [];

      for (const taskId of taskIds) {
        const task = await this.readJson<TaskRecord>(this.taskKey(taskId));
        if (!task || isExpired(task.expiresAt)) {
          continue;
        }

        // Apply date filters
        if (filters.from) {
          const fromDate = new Date(filters.from);
          if (new Date(task.createdAt) < fromDate) continue;
        }
        if (filters.to) {
          const toDate = new Date(filters.to);
          toDate.setHours(23, 59, 59, 999);
          if (new Date(task.createdAt) > toDate) continue;
        }

        tasks.push(task);
      }

      const total = tasks.length;
      const pending = tasks.filter(t => t.status === "pending").length;
      const running = tasks.filter(t => t.status === "running").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const failed = tasks.filter(t => t.status === "failed").length;
    const completionRate = total > 0 ? completed / total : 0;

    // Calculate average duration
    const completedTasks = tasks.filter(t => t.status === "completed" && t.createdAt && t.updatedAt);
    let averageDurationMs = 0;
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => {
        return sum + (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
      }, 0);
      averageDurationMs = totalDuration / completedTasks.length;
    }

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createdToday = tasks.filter(t => new Date(t.createdAt) >= today).length;
    const completedToday = tasks.filter(t => 
      t.status === "completed" && new Date(t.updatedAt) >= today
    ).length;

    // By Agent
    const byAgent: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const task of tasks) {
      const agent = task.assignedAgent || task.claimedBy || "unassigned";
      if (!byAgent[agent]) {
        byAgent[agent] = { total: 0, completed: 0, failed: 0 };
      }
      byAgent[agent].total++;
      if (task.status === "completed") byAgent[agent].completed++;
      if (task.status === "failed") byAgent[agent].failed++;
    }

    // By Day
    const byDay: Array<{ date: string; created: number; completed: number; failed: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= date && taskDate < nextDate;
      });

      const dayCompleted = tasks.filter(t => {
        if (t.status !== "completed") return false;
        const updateDate = new Date(t.updatedAt);
        return updateDate >= date && updateDate < nextDate;
      });

      const dayFailed = tasks.filter(t => {
        if (t.status !== "failed") return false;
        const updateDate = new Date(t.updatedAt);
        return updateDate >= date && updateDate < nextDate;
      });

      byDay.push({
        date: date.toISOString().split("T")[0],
        created: dayTasks.length,
        completed: dayCompleted.length,
        failed: dayFailed.length,
      });
    }

    return {
      summary: {
        total,
        pending,
        running,
        completed,
        failed,
        completionRate,
        averageDurationMs,
        createdToday,
        completedToday,
      },
      byAgent,
      byDay,
    };
    } catch (error) {
      console.error("Error getting stats:", error);
      // Return empty stats on error
      return {
        summary: {
          total: 0,
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          completionRate: 0,
          averageDurationMs: 0,
          createdToday: 0,
          completedToday: 0,
        },
        byAgent: {},
        byDay: [],
      };
    }
  }

  // ========== Dependencies ==========
  async getDependencies(taskId: string): Promise<DependenciesResponse | null> {
    const task = await this.readJson<TaskRecord>(this.taskKey(taskId));
    if (!task) {
      return null;
    }

    const dependencies: Array<{ taskId: string; title: string; status: TaskStatus; isBlocking?: boolean }> = [];
    const dependents: Array<{ taskId: string; title: string; status: TaskStatus }> = [];

    if (task.dependencies) {
      for (const dep of task.dependencies) {
        const depTask = await this.readJson<TaskRecord>(this.taskKey(dep.dependsOnTaskId));
        if (depTask) {
          const blockingStatus = dep.blockingStatus || ["pending", "running"];
          dependencies.push({
            taskId: depTask.taskId,
            title: depTask.title,
            status: depTask.status,
            isBlocking: blockingStatus.includes(depTask.status),
          });
        }
      }
    }

    // Get dependents
    const allTaskIds = await this.listTaskIdsFromIndex();
    for (const id of allTaskIds) {
      const t = await this.readJson<TaskRecord>(this.taskKey(id));
      if (t && t.dependencies) {
        for (const dep of t.dependencies) {
          if (dep.dependsOnTaskId === taskId) {
            dependents.push({
              taskId: t.taskId,
              title: t.title,
              status: t.status,
            });
            break;
          }
        }
      }
    }

    // Get child tasks
    if (task.childTaskIds) {
      for (const childId of task.childTaskIds) {
        const childTask = await this.readJson<TaskRecord>(this.taskKey(childId));
        if (childTask) {
          dependents.push({
            taskId: childTask.taskId,
            title: childTask.title,
            status: childTask.status,
          });
        }
      }
    }

    return { dependencies, dependents };
  }
}
