import {
  agentEventTypes,
  artifactTypes,
  type AgentEventType,
  type ClaimTaskInput,
  type CreateAgentEventInput,
  taskEventTypes,
  type TaskEventType,
  taskStatuses,
  taskVisibilities,
  type ArtifactType,
  type CreateTaskEventInput,
  type CreateTaskInput,
  type SaveArtifactInput,
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

export function isAgentEventType(value: unknown): value is AgentEventType {
  return typeof value === "string" && agentEventTypes.includes(value as AgentEventType);
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
    subagent: parseOptionalString(payload.subagent, "subagent"),
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

export function parseAgentEvent(body: unknown): CreateAgentEventInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const agentId = parseString(payload.agentId, "agentId");
  if (!agentId) {
    throw new Error("agentId is required.");
  }

  if (!isAgentEventType(payload.type)) {
    throw new Error("type is invalid. Must be one of: agent_spawned, agent_finished, agent_error, agent_heartbeat, agent_state_changed.");
  }

  const message = parseString(payload.message, "message");
  if (!message) {
    throw new Error("message is required.");
  }

  return {
    agentId,
    type: payload.type,
    message,
    metadata: payload.metadata && typeof payload.metadata === "object" ? (payload.metadata as Record<string, unknown>) : undefined,
  };
}

export function parseRegisterAgent(body: unknown): { agentId?: string; name: string; parentAgentId?: string; sessionId?: string } {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const rawAgentId = payload.agentId !== undefined ? parseString(payload.agentId, "agentId") : undefined;
  const agentId = rawAgentId && rawAgentId.length > 0 ? rawAgentId : undefined;

  const name = parseString(payload.name, "name");
  if (!name) {
    throw new Error("name is required.");
  }

  return {
    agentId,
    name,
    parentAgentId: parseOptionalString(payload.parentAgentId, "parentAgentId"),
    sessionId: parseOptionalString(payload.sessionId, "sessionId"),
  };
}

export function parseUpdateAgent(body: unknown): { name?: string; parentAgentId?: string; status?: "idle" | "running" | "waiting" | "completed" | "failed"; sessionId?: string; currentTaskId?: string; metadata?: Record<string, unknown> } {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;
  const validStatuses = ["idle", "running", "waiting", "completed", "failed"] as const;

  const result: { name?: string; parentAgentId?: string; status?: "idle" | "running" | "waiting" | "completed" | "failed"; sessionId?: string; currentTaskId?: string; metadata?: Record<string, unknown> } = {};

  if (payload.name !== undefined) {
    const name = parseString(payload.name, "name");
    if (!name) {
      throw new Error("name cannot be empty.");
    }
    result.name = name;
  }

  if (payload.parentAgentId !== undefined) {
    const value = parseOptionalString(payload.parentAgentId, "parentAgentId");
    result.parentAgentId = value && value.length > 0 ? value : undefined;
  }

  if (payload.status !== undefined) {
    const status = payload.status;
    if (typeof status !== "string" || !validStatuses.includes(status as typeof validStatuses[number])) {
      throw new Error("status must be one of idle, running, waiting, completed, failed.");
    }
    result.status = status as "idle" | "running" | "waiting" | "completed" | "failed";
  }

  if (payload.sessionId !== undefined) {
    result.sessionId = parseOptionalString(payload.sessionId, "sessionId");
  }

  if (payload.currentTaskId !== undefined) {
    result.currentTaskId = parseOptionalString(payload.currentTaskId, "currentTaskId");
  }

  if (payload.metadata !== undefined) {
    if (typeof payload.metadata !== "object") {
      throw new Error("metadata must be an object.");
    }
    result.metadata = payload.metadata as Record<string, unknown>;
  }

  return result;
}
