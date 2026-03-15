import type {
  AgentEvent,
  AgentRecord,
  Artifact,
  BatchRequest,
  BatchResult,
  ClaimTaskInput,
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
  UpdateAgentInput,
  UpdateTaskInput,
} from "@/lib/types/task";

export type Store = {
  // Task operations
  listTasks(): Promise<TaskRecord[]>;
  getTask(taskId: string): Promise<TaskRecord | null>;
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRecord | null>;
  claimTask(taskId: string, input: ClaimTaskInput): Promise<TaskRecord | null>;
  releaseTask(taskId: string, actor?: string): Promise<TaskRecord | null>;
  deleteTask(taskId: string): Promise<boolean>;
  saveArtifact(taskId: string, input: SaveArtifactInput): Promise<Artifact>;
  getArtifact(artifactId: string): Promise<Artifact | null>;
  listArtifactsForTask(taskId: string): Promise<Artifact[]>;
  appendTaskEvent(taskId: string, input: CreateTaskEventInput): Promise<TaskEvent>;
  listTaskEvents(taskId: string): Promise<TaskEvent[]>;
  getContextBundle(taskId: string, actor?: string): Promise<ContextBundle | null>;

  // Task filtering
  listTasksWithFilters(options: TaskListOptions): Promise<TaskListResponse>;

  // Batch operations
  batchUpdate(request: BatchRequest): Promise<BatchResult>;

  // Statistics
  getStats(filters: TaskFilters): Promise<TaskStats>;

  // Dependencies
  getDependencies(taskId: string): Promise<DependenciesResponse | null>;

  // Agent operations
  registerAgent(agentId: string, name: string, parentAgentId?: string, sessionId?: string): Promise<AgentRecord>;
  updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentRecord | null>;
  getAgent(agentId: string): Promise<AgentRecord | null>;
  listAgents(): Promise<AgentRecord[]>;
  heartbeatAgent(agentId: string): Promise<AgentRecord | null>;
  removeAgent(agentId: string): Promise<boolean>;
  appendAgentEvent(input: CreateAgentEventInput): Promise<AgentEvent>;
  listAgentEvents(agentId?: string): Promise<AgentEvent[]>;

  // SubAgent operations
  createSubAgent(input: {
    parentAgent: string;
    name: string;
    description?: string;
    tags?: string[];
  }): Promise<SubAgent>;
  getSubAgent(id: string): Promise<SubAgent | null>;
  listSubAgents(parentAgent?: string): Promise<SubAgent[]>;
  updateSubAgent(
    id: string,
    input: {
      name?: string;
      description?: string;
      tags?: string[];
      enabled?: boolean;
    }
  ): Promise<SubAgent | null>;
  deleteSubAgent(id: string): Promise<boolean>;
};
