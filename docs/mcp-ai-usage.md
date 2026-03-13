# MCP AI Usage Guide (for Root and Subagents)

This document explains how an AI agent should use this project when it is exposed as MCP tools.

## 1. Purpose

Use this service as an external task-memory layer so agents do not pollute each other's context.

Core rule:
- Exchange `taskId + summary + refs`, not full raw conversation history.

## 2. Base URL

- Local: `http://localhost:3333`

All MCP tools below are wrappers over these HTTP APIs.

## 3. Tool Mapping

1. `list_tasks`
- `GET /api/tasks`
- No input
- Returns all task cards

2. `create_task`
- `POST /api/tasks`
- Input: `title` required; optional `summary`, `parentTaskId`, `assignedAgent`, `visibility`, `inputRefs`, `tags`, `resultSummary`

3. `get_task`
- `GET /api/tasks/{taskId}`
- Returns task plus latest linked artifact (if any)

4. `update_task`
- `PATCH /api/tasks/{taskId}`
- Input: any subset of `status`, `summary`, `resultSummary`, `assignedAgent`, `visibility`, `inputRefs`, `outputRefs`, `tags`

5. `save_artifact`
- `POST /api/tasks/{taskId}/artifact`
- Input: `content` required; optional `type`, `summary`, `sourceAgent`, `tags`

6. `list_task_events`
- `GET /api/tasks/{taskId}/events`

7. `append_task_event`
- `POST /api/tasks/{taskId}/events`
- Input: `type`, `message`, optional `actor`, `metadata`

8. `get_task_context`
- `GET /api/tasks/{taskId}/context?actor={actor}`
- Returns context bundle filtered by access level

9. `claim_task`
- `POST /api/tasks/{taskId}/claim`
- Input: `actor` required; optional `leaseSeconds`

10. `release_task`
- `DELETE /api/tasks/{taskId}/claim?actor={actor}`

## 4. Access Model (critical)

`get_task_context` returns one of:
- `full`: can read artifacts
- `summary_only`: cannot read artifacts; only summary + metadata + events

Current policy:
1. `root` always has `full`
2. task `assignedAgent` has `full`
3. current `claimedBy` has `full`
4. `visibility=shared` gives `full` to any actor
5. `visibility=parent` gives `full` to parent task owner actors
6. others get `summary_only`

## 5. Root Agent Protocol

Follow this strict sequence for each new task:

1. `create_task`
2. (optional) `claim_task` by selected worker actor
3. `update_task` to `running`
4. give worker only:
   - `taskId`
   - short objective
   - minimal refs (`inputRefs`)
5. worker reads context using `get_task_context(actor=worker-name)`
6. worker writes result via `save_artifact`
7. worker updates card via `update_task` (`summary`, `outputRefs`, `status`)
8. root verifies via `get_task` + `list_task_events`
9. root marks `completed` or `failed`
10. `release_task`

Never skip step 7, otherwise task graph becomes stale.

## 6. Subagent Protocol

Subagent must:
1. read only via `get_task_context` with its own actor name
2. avoid direct cross-agent message passing
3. persist detailed output with `save_artifact`
4. persist state with `update_task`

Subagent must not:
- copy full prior chat logs into new tasks
- send large raw artifacts to another agent directly

## 7. Recommended Root System Prompt

Use this template in your root agent:

```text
You are a root orchestrator using MCP task-memory tools.
Rules:
1) Always create a task card before execution.
2) Never pass full raw context between agents.
3) Pass only taskId, summary, and refs.
4) Before any worker action, fetch get_task_context with that worker actor.
5) After worker action, require save_artifact + update_task.
6) Keep task status accurate: pending -> running -> completed/failed.
7) Use claim/release for task ownership to avoid duplicate execution.
```

## 8. Failure Handling

If tool call fails:
1. retry once
2. append event with failure reason
3. mark task `failed` if blocking

If context access is `summary_only` but detail is needed:
1. reassign or claim task with correct actor
2. or change visibility intentionally
3. call `get_task_context` again

## 9. Minimal Example Flow

1. root calls `create_task(title="Implement login API", assignedAgent="backend-agent")`
2. root calls `claim_task(taskId, actor="backend-agent")`
3. backend-agent calls `get_task_context(taskId, actor="backend-agent")`
4. backend-agent calls `save_artifact(taskId, type="code", content="...")`
5. backend-agent calls `update_task(taskId, status="completed", summary="login API done", outputRefs=["artifact_x"])`
6. root calls `release_task(taskId, actor="backend-agent")`

## 10. Operational Notes

- Default retention is 7 days (`CACHE_TTL_DAYS=7`)
- Prefer Redis mode in production (`REDIS_URL=...`)
- Events are your audit log; do not disable event writes
