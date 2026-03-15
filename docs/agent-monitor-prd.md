# Agent 执行流监控功能 PRD

> **项目**: claw-memory-plugin  
> **版本**: v1.0  
> **日期**: 2026-03-14

## 1. 背景与目标

### 背景
当前面板（记忆查询台）只能查看任务列表和任务详情，缺少对 Agent 实时执行状态的监控能力。需要增加实时监控功能，帮助开发者了解 Agent 的运行状态。

### 目标
- 实时显示活跃 Agent 的状态（运行中 / 等待 / 完成 / 失败）
- 接收并展示 Agent 事件日志（spawn / 完成 / 失败等）
- 提供 API 接口供 Agent 上报状态和事件

---

## 2. 功能列表

### 2.1 Agent 列表
- 显示当前活跃的 Agent（Root + subagent）
- 每个 Agent 的状态：`running` / `waiting` / `completed` / `failed` / `idle`
- 显示 Agent 启动时间
- 显示 Agent 关联的 sessionId 和 currentTaskId

### 2.2 实时日志流
- 接收 Agent 发送的事件
- 显示事件类型：`agent_spawned` / `agent_finished` / `agent_error` / `agent_heartbeat` / `agent_state_changed`
- 实时刷新（WebSocket 或轮询）
- 支持按 Agent 过滤

### 2.3 API 接口

#### POST /api/agents/events
接收 Agent 事件上报。

**请求体**:
```json
{
  "agentId": "agent_xxx",
  "type": "agent_spawned",
  "message": "Agent 已启动",
  "metadata": {}
}
```

#### GET /api/agents
获取活跃 Agent 列表。

**响应**:
```json
{
  "agents": [
    {
      "agentId": "root",
      "name": "Root Agent",
      "status": "running",
      "sessionId": "session_xxx",
      "createdAt": "2026-03-14T10:00:00Z",
      "lastHeartbeatAt": "2026-03-14T11:00:00Z"
    }
  ]
}
```

#### GET /api/agents/events
获取 Agent 事件日志。

**查询参数**:
- `agentId`: 可选，按 Agent 过滤
- `limit`: 可选，返回数量限制（默认 50）

#### POST /api/agents/register
注册新 Agent。

**请求体**:
```json
{
  "agentId": "agent_xxx",
  "name": "Planner Agent",
  "parentAgentId": "root",
  "sessionId": "session_xxx"
}
```

#### PATCH /api/agents/:agentId
更新 Agent 状态。

**请求体**:
```json
{
  "status": "running",
  "currentTaskId": "task_xxx"
}
```

#### POST /api/agents/:agentId/heartbeat
Agent 心跳保活。

---

## 3. 技术方案

### 3.1 存储层
- **内存存储**（复用现有 MemoryStore 模式）
- 新增 `agents` Map 存储 Agent 记录
- 新增 `agentEvents` Map 存储 Agent 事件
- 复用 `expiresAt` 机制自动清理过期数据

### 3.2 API 路由结构
```
app/api/agents/
├── route.ts          # GET /api/agents, POST /api/agents/events
├── [agentId]/
│   └── route.ts      # PATCH /api/agents/:agentId
├── [agentId]/heartbeat/
│   └── route.ts      # POST /api/agents/:agentId/heartbeat
└── events/
    └── route.ts      # GET /api/agents/events
```

### 3.3 前端展示
- 新增 "Agent 监控" 标签页
- Agent 列表组件（实时状态）
- 事件流组件（实时日志）
- 轮询刷新（5 秒间隔）或 WebSocket

### 3.4 事件类型定义
已在 `lib/types/task.ts` 中定义：
```typescript
export const agentEventTypes = [
  "agent_spawned",
  "agent_finished",
  "agent_error",
  "agent_heartbeat",
  "agent_state_changed",
] as const;

export type AgentStatus = "idle" | "running" | "waiting" | "completed" | "failed";
```

---

## 4. 实施计划

### Phase 1: 后端 API
- [ ] 完善 MemoryStore 的 Agent 操作方法
- [ ] 实现 POST /api/agents/register
- [ ] 实现 GET /api/agents
- [ ] 实现 PATCH /api/agents/:agentId
- [ ] 实现 POST /api/agents/:agentId/heartbeat
- [ ] 实现 POST /api/agents/events
- [ ] 实现 GET /api/agents/events

### Phase 2: 前端
- [ ] 新增 Agent 监控标签页
- [ ] Agent 列表组件
- [ ] 事件流组件
- [ ] 轮询刷新逻辑

### Phase 3: 集成测试
- [ ] 验证 Agent 注册和状态更新
- [ ] 验证事件上报和接收
- [ ] 验证前端实时展示

---

## 5. 验收标准

1. **Agent 注册**: 调用 POST /api/agents/register 能成功创建 Agent 记录
2. **状态更新**: 调用 PATCH /api/agents/:agentId 能更新 Agent 状态
3. **心跳保活**: 调用 POST /api/agents/:agentId/heartbeat 能更新最后活跃时间
4. **事件上报**: 调用 POST /api/agents/events 能记录事件
5. **列表查询**: GET /api/agents 返回活跃 Agent 列表（未过期的）
6. **事件查询**: GET /api/agents/events 返回事件日志
7. **前端展示**: Agent 监控页面能实时显示 Agent 列表和事件流

---

## 6. 依赖项

- 复用 `lib/store/memory-store.ts` 的存储模式
- 复用 `lib/types/task.ts` 中的类型定义
- 复用现有 API 路由的 error handling 模式
