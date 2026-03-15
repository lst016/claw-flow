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
const DEFAULT_SUMMARY = "暂无摘要。";
const TASK_NOT_FOUND = "任务不存在。";
const AGENT_NOT_FOUND = "Agent 不存在。";
const AGENT_TIMEOUT_SECONDS = 5 * 60; // 5 minutes timeout

export class MemoryStore implements Store {
  private tasks = new Map<string, TaskRecord>();
  private artifacts = new Map<string, Artifact>();
  private taskArtifacts = new Map<string, string[]>();
  private taskEvents = new Map<string, TaskEvent[]>();

  // Agent state
  private agents = new Map<string, AgentRecord>();
  private agentEvents: AgentEvent[] = [];

  // SubAgent state
  private subAgents = new Map<string, SubAgent>();

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

    // Cleanup expired agents
    for (const [agentId, agent] of this.agents) {
      if (isExpired(agent.expiresAt, now)) {
        this.agents.delete(agentId);
      }
    }

    // Cleanup expired agent events
    this.agentEvents = this.agentEvents.filter((event) => !isExpired(event.expiresAt, now));
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
      subagent: input.subagent,
      visibility: input.visibility ?? "private",
      inputRefs: input.inputRefs ?? [],
      outputRefs: [],
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: this.nextExpiresAt(),
    };

    // Handle dependencies
    if (input.dependsOnTaskIds && input.dependsOnTaskIds.length > 0) {
      task.dependencies = input.dependsOnTaskIds.map(depId => ({
        dependsOnTaskId: depId,
        blockingStatus: ["pending", "running"],
      }));
      // Add reverse reference
      task.dependsOnMe = [];
    }

    this.tasks.set(task.taskId, task);
    this.taskArtifacts.set(task.taskId, []);
    this.taskEvents.set(task.taskId, []);

    // Handle parent task relationship
    if (input.parentTaskId) {
      const parentTask = this.tasks.get(input.parentTaskId);
      if (parentTask) {
        const childTaskIds = parentTask.childTaskIds || [];
        parentTask.childTaskIds = [...childTaskIds, task.taskId];
        this.tasks.set(input.parentTaskId, parentTask);
      }
    }

    // Auto-create task_created event
    await this.appendTaskEvent(task.taskId, {
      type: "task_created",
      actor: input.assignedAgent ?? "system",
      message: `已创建任务：${task.title}`,
      metadata: {
        visibility: task.visibility,
        inputRefs: task.inputRefs,
        assignedAgent: task.assignedAgent,
        parentTaskId: task.parentTaskId,
        dependencies: task.dependencies?.map(d => d.dependsOnTaskId),
      },
    });

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

    // Auto-create task event on status change
    if (input.status && input.status !== current.status) {
      let eventType: "task_updated" | "task_completed" | "task_failed";
      let eventMessage: string;

      if (input.status === "completed") {
        eventType = "task_completed";
        eventMessage = `任务已完成：${next.title}`;
      } else if (input.status === "failed") {
        eventType = "task_failed";
        eventMessage = `任务执行失败：${next.title}`;
      } else {
        eventType = "task_updated";
        eventMessage = `任务状态更新为 ${input.status}：${next.title}`;
      }

      await this.appendTaskEvent(taskId, {
        type: eventType,
        actor: input.claimedBy ?? input.assignedAgent ?? "system",
        message: eventMessage,
        metadata: {
          oldStatus: current.status,
          newStatus: input.status,
          visibility: next.visibility,
          inputRefs: next.inputRefs,
          outputRefs: next.outputRefs,
        },
      });
    }

    return next;
  }

  async claimTask(taskId: string, input: ClaimTaskInput) {
    this.cleanupExpired();
    const current = this.tasks.get(taskId);
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

    this.tasks.set(taskId, next);
    return next;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    this.cleanupExpired();
    const exists = this.tasks.has(taskId);
    if (!exists) {
      return false;
    }

    this.tasks.delete(taskId);
    this.taskArtifacts.delete(taskId);
    this.taskEvents.delete(taskId);
    return true;
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

  // Agent operations

  async registerAgent(agentId: string, name: string, parentAgentId?: string, sessionId?: string): Promise<AgentRecord> {
    this.cleanupExpired();
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

    this.agents.set(agentId, agent);
    return agent;
  }

  async updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentRecord | null> {
    this.cleanupExpired();
    const current = this.agents.get(agentId);
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

    this.agents.set(agentId, next);
    return next;
  }

  async getAgent(agentId: string): Promise<AgentRecord | null> {
    this.cleanupExpired();
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    // Check if agent has timed out
    if (isExpired(agent.expiresAt)) {
      this.agents.delete(agentId);
      return null;
    }

    return agent;
  }

  async listAgents(): Promise<AgentRecord[]> {
    this.cleanupExpired();
    const now = Date.now();
    const activeAgents: AgentRecord[] = [];

    for (const [agentId, agent] of this.agents) {
      if (!isExpired(agent.expiresAt, now)) {
        activeAgents.push(agent);
      } else {
        this.agents.delete(agentId);
      }
    }

    return activeAgents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async heartbeatAgent(agentId: string): Promise<AgentRecord | null> {
    this.cleanupExpired();
    const current = this.agents.get(agentId);
    if (!current) {
      return null;
    }

    const next: AgentRecord = {
      ...current,
      updatedAt: nowIso(),
      lastHeartbeatAt: nowIso(),
      expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
    };

    this.agents.set(agentId, next);
    return next;
  }

  async removeAgent(agentId: string): Promise<boolean> {
    this.cleanupExpired();
    return this.agents.delete(agentId);
  }

  async appendAgentEvent(input: CreateAgentEventInput): Promise<AgentEvent> {
    this.cleanupExpired();
    const event: AgentEvent = {
      eventId: makeId("agevt"),
      agentId: input.agentId,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
      createdAt: nowIso(),
      expiresAt: this.nextExpiresAt(),
    };

    this.agentEvents = [event, ...this.agentEvents];

    // Also update the agent's lastHeartbeatAt
    const agent = this.agents.get(input.agentId);
    if (agent) {
      this.agents.set(input.agentId, {
        ...agent,
        updatedAt: nowIso(),
        lastHeartbeatAt: nowIso(),
        expiresAt: addSecondsToIso(AGENT_TIMEOUT_SECONDS),
      });
    }

    return event;
  }

  async listAgentEvents(agentId?: string): Promise<AgentEvent[]> {
    this.cleanupExpired();
    if (agentId) {
      return this.agentEvents.filter((event) => event.agentId === agentId);
    }
    return [...this.agentEvents];
  }

  // ========== SubAgent CRUD ==========

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
    this.subAgents.set(id, subAgent);
    return subAgent;
  }

  async getSubAgent(id: string): Promise<SubAgent | null> {
    return this.subAgents.get(id) || null;
  }

  async listSubAgents(parentAgent?: string): Promise<SubAgent[]> {
    const all = Array.from(this.subAgents.values());
    if (parentAgent) {
      return all.filter((s) => s.parentAgent === parentAgent);
    }
    return all;
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
    const current = this.subAgents.get(id);
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
    this.subAgents.set(id, updated);
    return updated;
  }

  async deleteSubAgent(id: string): Promise<boolean> {
    return this.subAgents.delete(id);
  }

  // ========== Task Filtering ==========
  async listTasksWithFilters(options: TaskListOptions): Promise<TaskListResponse> {
    this.cleanupExpired();
    const { filters, page = 1, limit = 20 } = options;
    
    let tasks = [...this.tasks.values()];

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      tasks = tasks.filter(task => filters.status!.includes(task.status));
    }

    if (filters.agent) {
      tasks = tasks.filter(task => 
        task.assignedAgent === filters.agent || task.claimedBy === filters.agent
      );
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      tasks = tasks.filter(task => new Date(task.createdAt) >= fromDate);
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      tasks = tasks.filter(task => new Date(task.createdAt) <= toDate);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.summary.toLowerCase().includes(searchLower)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(task => 
        filters.tags!.some(tag => task.tags.includes(tag))
      );
    }

    if (filters.parentTaskId) {
      tasks = tasks.filter(task => task.parentTaskId === filters.parentTaskId);
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
    this.cleanupExpired();
    const success: string[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];

    for (const taskId of request.taskIds) {
      try {
        const task = this.tasks.get(taskId);
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
            this.tasks.delete(taskId);
            this.taskArtifacts.delete(taskId);
            this.taskEvents.delete(taskId);
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
    this.cleanupExpired();
    const tasks = [...this.tasks.values()];

    // Apply date filters
    let filteredTasks = tasks;
    if (filters.from) {
      const fromDate = new Date(filters.from);
      filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) >= fromDate);
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) <= toDate);
    }

    const total = filteredTasks.length;
    const pending = filteredTasks.filter(t => t.status === "pending").length;
    const running = filteredTasks.filter(t => t.status === "running").length;
    const completed = filteredTasks.filter(t => t.status === "completed").length;
    const failed = filteredTasks.filter(t => t.status === "failed").length;

    // Calculate completion rate
    const completionRate = total > 0 ? completed / total : 0;

    // Calculate average duration (only for completed tasks)
    const completedTasks = filteredTasks.filter(t => t.status === "completed" && t.createdAt && t.updatedAt);
    let averageDurationMs = 0;
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => {
        return sum + (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
      }, 0);
      averageDurationMs = totalDuration / completedTasks.length;
    }

    // Today's stats - use filter dates if provided, otherwise use current date
    let filterStartDate: Date;
    let filterEndDate: Date;
    
    if (filters.from) {
      filterStartDate = new Date(filters.from);
      filterStartDate.setHours(0, 0, 0, 0);
    } else {
      filterStartDate = new Date();
      filterStartDate.setHours(0, 0, 0, 0);
    }
    
    if (filters.to) {
      filterEndDate = new Date(filters.to);
      filterEndDate.setHours(23, 59, 59, 999);
    } else {
      filterEndDate = new Date();
      filterEndDate.setHours(23, 59, 59, 999);
    }
    
    const createdToday = filteredTasks.filter(t => {
      const taskDate = new Date(t.createdAt);
      return taskDate >= filterStartDate && taskDate <= filterEndDate;
    }).length;
    
    const completedToday = filteredTasks.filter(t => 
      t.status === "completed" && new Date(t.updatedAt) >= filterStartDate && new Date(t.updatedAt) <= filterEndDate
    ).length;

    // By Agent
    const byAgent: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const task of filteredTasks) {
      const agent = task.assignedAgent || task.claimedBy || "unassigned";
      if (!byAgent[agent]) {
        byAgent[agent] = { total: 0, completed: 0, failed: 0 };
      }
      byAgent[agent].total++;
      if (task.status === "completed") byAgent[agent].completed++;
      if (task.status === "failed") byAgent[agent].failed++;
    }

    // By Day (last 30 days)
    const byDay: Array<{ date: string; created: number; completed: number; failed: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = filteredTasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= date && taskDate < nextDate;
      });

      const dayCompleted = filteredTasks.filter(t => {
        if (t.status !== "completed") return false;
        const updateDate = new Date(t.updatedAt);
        return updateDate >= date && updateDate < nextDate;
      });

      const dayFailed = filteredTasks.filter(t => {
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
  }

  // ========== Dependencies ==========
  async getDependencies(taskId: string): Promise<DependenciesResponse | null> {
    this.cleanupExpired();
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const dependencies: Array<{ taskId: string; title: string; status: TaskStatus; isBlocking?: boolean }> = [];
    const dependents: Array<{ taskId: string; title: string; status: TaskStatus }> = [];

    // Get dependencies
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        const depTask = this.tasks.get(dep.dependsOnTaskId);
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

    // Get dependents (tasks that depend on this task)
    for (const [id, t] of this.tasks) {
      if (t.dependencies) {
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

    // Also get child tasks
    if (task.childTaskIds) {
      for (const childId of task.childTaskIds) {
        const childTask = this.tasks.get(childId);
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
