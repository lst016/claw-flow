export const taskStatuses = ["pending", "running", "completed", "failed"] as const;
export const taskVisibilities = ["private", "parent", "shared"] as const;
export const artifactTypes = ["note", "plan", "analysis", "log", "code", "result", "test"] as const;
export const taskEventTypes = [
  "task_created",
  "task_updated",
  "task_completed",
  "task_failed",
  "artifact_saved",
  "context_read",
  "task_claimed",
  "task_released",
] as const;

export const agentEventTypes = [
  "agent_spawned",
  "agent_finished",
  "agent_error",
  "agent_heartbeat",
  "agent_state_changed",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskVisibility = (typeof taskVisibilities)[number];
export type ArtifactType = (typeof artifactTypes)[number];
export type TaskEventType = (typeof taskEventTypes)[number];
export type AgentEventType = (typeof agentEventTypes)[number];
export type ContextAccessMode = "full" | "summary_only";

export type AgentStatus = "idle" | "running" | "waiting" | "completed" | "failed";

export type AgentRecord = {
  agentId: string;
  parentAgentId?: string;
  name: string;
  status: AgentStatus;
  sessionId?: string;
  currentTaskId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
};

// SubAgent 类型：属于某个根 agent 的子代理配置
export type SubAgent = {
  id: string;
  // 所属的根 agent（如 dev-assistant, main, creator）
  parentAgent: string;
  // 子 agent 名称（如 开发、测试、设计）
  name: string;
  // 描述
  description?: string;
  // 技能标签
  tags: string[];
  // 是否启用
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentEvent = {
  eventId: string;
  agentId: string;
  type: AgentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
};

export type Artifact = {
  artifactId: string;
  taskId: string;
  type: ArtifactType;
  content: string;
  summary?: string;
  sourceAgent?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type TaskDependency = {
  dependsOnTaskId: string;
  blockingStatus?: TaskStatus[];
};

export type TaskRecord = {
  taskId: string;
  title: string;
  status: TaskStatus;
  summary: string;
  resultSummary?: string;
  detailRef?: string;
  parentTaskId?: string;
  // 新增：子任务ID列表
  childTaskIds?: string[];
  // 新增：依赖列表
  dependencies?: TaskDependency[];
  // 新增：依赖此任务的任务（反向引用）
  dependsOnMe?: string[];
  assignedAgent?: string;
  // 子 agent 名称（如 开发、测试、设计等），历史数据默认空
  subagent?: string;
  claimedBy?: string;
  claimedAt?: string;
  leaseExpiresAt?: string;
  visibility: TaskVisibility;
  inputRefs: string[];
  outputRefs: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type TaskEvent = {
  eventId: string;
  taskId: string;
  type: TaskEventType;
  actor?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
};

export type ContextBundle = {
  task: TaskRecord;
  inputArtifacts: Artifact[];
  outputArtifacts: Artifact[];
  recentEvents: TaskEvent[];
  guidance: {
    mode: "summary_first";
    summary: string;
    visibility: TaskVisibility;
    suggestedRefs: string[];
    actor: string;
    access: ContextAccessMode;
  };
};

export type TaskContextResponse = {
  context: ContextBundle;
  actor: string;
};

export type CreateTaskInput = {
  title: string;
  summary?: string;
  parentTaskId?: string;
  assignedAgent?: string;
  // 子 Agent 名称（如 开发、测试、设计）
  subagent?: string;
  visibility?: TaskVisibility;
  inputRefs?: string[];
  tags?: string[];
  resultSummary?: string;
  // 新增：依赖任务ID列表
  dependsOnTaskIds?: string[];
};

export type UpdateTaskInput = {
  status?: TaskStatus;
  summary?: string;
  resultSummary?: string;
  detailRef?: string;
  assignedAgent?: string;
  claimedBy?: string;
  claimedAt?: string;
  leaseExpiresAt?: string;
  visibility?: TaskVisibility;
  inputRefs?: string[];
  outputRefs?: string[];
  tags?: string[];
};

export type SaveArtifactInput = {
  content: string;
  type?: ArtifactType;
  summary?: string;
  sourceAgent?: string;
  tags?: string[];
};

export type CreateTaskEventInput = {
  type: TaskEventType;
  actor?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type ClaimTaskInput = {
  actor: string;
  leaseSeconds?: number;
};

export type CreateAgentEventInput = {
  agentId: string;
  type: AgentEventType;
  message: string;
  metadata?: Record<string, unknown>;
};

export type UpdateAgentInput = {
  name?: string;
  parentAgentId?: string;
  status?: AgentStatus;
  sessionId?: string;
  currentTaskId?: string;
  metadata?: Record<string, unknown>;
};

// ========== 筛选相关类型 ==========
export type TaskFilters = {
  status?: TaskStatus[];
  agent?: string;
  from?: string;
  to?: string;
  search?: string;
  tags?: string[];
  parentTaskId?: string;
};

export type TaskListOptions = {
  filters: TaskFilters;
  page?: number;
  limit?: number;
};

export type TaskListResponse = {
  tasks: TaskRecord[];
  total: number;
  page: number;
  limit: number;
  filters: TaskFilters;
};

// ========== 批量操作相关类型 ==========
export type BatchAction = "update_status" | "delete" | "assign_agent" | "add_tags" | "remove_tags";

export type BatchUpdatePayload = {
  status?: TaskStatus;
  agent?: string;
  tags?: string[];
};

export type BatchRequest = {
  taskIds: string[];
  action: BatchAction;
  payload?: BatchUpdatePayload;
};

export type BatchResult = {
  success: string[];
  failed: Array<{ taskId: string; error: string }>;
};

// ========== 统计分析相关类型 ==========
export type TokenUsageStats = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
};

export type TokenUsageDaily = {
  date: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
};

export type TokenUsageResponse = {
  updatedAt: number;
  days: number;
  daily: TokenUsageDaily[];
  totals: TokenUsageStats;
};

// 按模型统计类型
export type ModelUsageStats = {
  modelId: string;
  provider: string;
  sessionCount: number;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
};

export type ModelUsageResponse = {
  updatedAt: number;
  models: ModelUsageStats[];
  totals: {
    sessionCount: number;
    messageCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  };
};

export type TaskStats = {
  summary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    completionRate: number;
    averageDurationMs: number;
    createdToday: number;
    completedToday: number;
  };
  byAgent: Record<string, {
    total: number;
    completed: number;
    failed: number;
  }>;
  byDay: Array<{
    date: string;
    created: number;
    completed: number;
    failed: number;
  }>;
  tokenUsage?: TokenUsageResponse;
  modelUsage?: ModelUsageResponse;
};

// ========== 任务依赖相关类型 ==========
export type DependencyInfo = {
  taskId: string;
  title: string;
  status: TaskStatus;
  isBlocking?: boolean;
};

export type DependenciesResponse = {
  dependencies: DependencyInfo[];
  dependents: DependencyInfo[];
};

// ========== 通知相关类型 ==========
export type NotificationType = 
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_failed"
  | "task_assigned"
  | "task_claimed"
  | "dependency_blocked";

export type Notification = {
  notificationId: string;
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  message: string;
  actor?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt: string;
};
