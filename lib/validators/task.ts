import {
  artifactTypes,
  type ClaimTaskInput,
  taskEventTypes,
  taskStatuses,
  taskVisibilities,
  type ArtifactType,
  type CreateTaskEventInput,
  type CreateTaskInput,
  type SaveArtifactInput,
  type TaskEventType,
  type TaskStatus,
  type TaskVisibility,
  type UpdateTaskInput,
} from "@/lib/types/task";

function parseString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  return parseString(value, field);
}

function parseStringArray(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatuses.includes(value as TaskStatus);
}

export function isTaskVisibility(value: unknown): value is TaskVisibility {
  return typeof value === "string" && taskVisibilities.includes(value as TaskVisibility);
}

export function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === "string" && artifactTypes.includes(value as ArtifactType);
}

export function isTaskEventType(value: unknown): value is TaskEventType {
  return typeof value === "string" && taskEventTypes.includes(value as TaskEventType);
}

export function parseCreateTask(body: unknown): CreateTaskInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const title = parseString(payload.title, "title");
  if (!title) {
    throw new Error("title is required.");
  }

  if (payload.visibility !== undefined && !isTaskVisibility(payload.visibility)) {
    throw new Error("visibility must be one of private, parent, shared.");
  }

  return {
    title,
    summary: parseOptionalString(payload.summary, "summary"),
    parentTaskId: parseOptionalString(payload.parentTaskId, "parentTaskId"),
    assignedAgent: parseOptionalString(payload.assignedAgent, "assignedAgent"),
    visibility: payload.visibility as TaskVisibility | undefined,
    inputRefs: parseStringArray(payload.inputRefs, "inputRefs"),
    tags: parseStringArray(payload.tags, "tags"),
    resultSummary: parseOptionalString(payload.resultSummary, "resultSummary"),
  };
}

export function parseUpdateTask(body: unknown): UpdateTaskInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const next: UpdateTaskInput = {};

  if (payload.status !== undefined) {
    if (!isTaskStatus(payload.status)) {
      throw new Error("status must be one of pending, running, completed, failed.");
    }
    next.status = payload.status;
  }

  if (payload.visibility !== undefined) {
    if (!isTaskVisibility(payload.visibility)) {
      throw new Error("visibility must be one of private, parent, shared.");
    }
    next.visibility = payload.visibility;
  }

  next.summary = parseOptionalString(payload.summary, "summary");
  next.resultSummary = parseOptionalString(payload.resultSummary, "resultSummary");
  next.detailRef = parseOptionalString(payload.detailRef, "detailRef");
  next.assignedAgent = parseOptionalString(payload.assignedAgent, "assignedAgent");
  next.claimedBy = parseOptionalString(payload.claimedBy, "claimedBy");
  next.claimedAt = parseOptionalString(payload.claimedAt, "claimedAt");
  next.leaseExpiresAt = parseOptionalString(payload.leaseExpiresAt, "leaseExpiresAt");
  next.inputRefs = parseStringArray(payload.inputRefs, "inputRefs");
  next.outputRefs = parseStringArray(payload.outputRefs, "outputRefs");
  next.tags = parseStringArray(payload.tags, "tags");

  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)) as UpdateTaskInput;
}

export function parseArtifact(body: unknown): SaveArtifactInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const content = parseString(payload.content, "content");
  if (!content) {
    throw new Error("content is required.");
  }

  if (payload.type !== undefined && !isArtifactType(payload.type)) {
    throw new Error("type must be one of note, plan, analysis, log, code, result, test.");
  }

  return {
    content,
    type: payload.type as ArtifactType | undefined,
    summary: parseOptionalString(payload.summary, "summary"),
    sourceAgent: parseOptionalString(payload.sourceAgent, "sourceAgent"),
    tags: parseStringArray(payload.tags, "tags"),
  };
}

export function parseTaskEvent(body: unknown): CreateTaskEventInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  if (!isTaskEventType(payload.type)) {
    throw new Error("type is invalid.");
  }

  const message = parseString(payload.message, "message");
  if (!message) {
    throw new Error("message is required.");
  }

  return {
    type: payload.type,
    actor: parseOptionalString(payload.actor, "actor"),
    message,
    metadata: payload.metadata && typeof payload.metadata === "object" ? (payload.metadata as Record<string, unknown>) : undefined,
  };
}

export function parseClaimTask(body: unknown): ClaimTaskInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const actor = parseString(payload.actor, "actor");
  if (!actor) {
    throw new Error("actor is required.");
  }

  const leaseSeconds =
    payload.leaseSeconds === undefined
      ? undefined
      : typeof payload.leaseSeconds === "number" && Number.isFinite(payload.leaseSeconds)
        ? payload.leaseSeconds
        : (() => {
            throw new Error("leaseSeconds must be a number.");
          })();

  return {
    actor,
    leaseSeconds,
  };
}
