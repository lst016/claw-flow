import type {
  Artifact,
  ClaimTaskInput,
  ContextBundle,
  CreateTaskEventInput,
  CreateTaskInput,
  SaveArtifactInput,
  TaskEvent,
  TaskRecord,
  UpdateTaskInput,
} from "@/lib/types/task";

export type Store = {
  listTasks(): Promise<TaskRecord[]>;
  getTask(taskId: string): Promise<TaskRecord | null>;
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRecord | null>;
  claimTask(taskId: string, input: ClaimTaskInput): Promise<TaskRecord | null>;
  releaseTask(taskId: string, actor?: string): Promise<TaskRecord | null>;
  saveArtifact(taskId: string, input: SaveArtifactInput): Promise<Artifact>;
  getArtifact(artifactId: string): Promise<Artifact | null>;
  listArtifactsForTask(taskId: string): Promise<Artifact[]>;
  appendTaskEvent(taskId: string, input: CreateTaskEventInput): Promise<TaskEvent>;
  listTaskEvents(taskId: string): Promise<TaskEvent[]>;
  getContextBundle(taskId: string, actor?: string): Promise<ContextBundle | null>;
};
