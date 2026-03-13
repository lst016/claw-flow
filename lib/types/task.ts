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

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskVisibility = (typeof taskVisibilities)[number];
export type ArtifactType = (typeof artifactTypes)[number];
export type TaskEventType = (typeof taskEventTypes)[number];
export type ContextAccessMode = "full" | "summary_only";

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

export type TaskRecord = {
  taskId: string;
  title: string;
  status: TaskStatus;
  summary: string;
  resultSummary?: string;
  detailRef?: string;
  parentTaskId?: string;
  assignedAgent?: string;
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
  visibility?: TaskVisibility;
  inputRefs?: string[];
  tags?: string[];
  resultSummary?: string;
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
