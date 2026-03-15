# Claw 任务系统集成指南

## 概述

Claw 任务中心是一个面向 OpenClaw 的任务分发与子代理管理插件，提供任务调度、子代理管理等功能。

---

## 快速集成

### 1. 插件注册

在 OpenClaw 配置中添加插件：

```json
{
  "plugins": {
    "claw-memory": {
      "enabled": true,
      "url": "http://localhost:3333"
    }
  }
}
```

### 2. 路由配置

在 Gateway 配置中添加路由规则：

```json
{
  "router": {
    "/api/claw-tasks": "http://localhost:3333/api"
  }
}
```

---

## 任务分发机制

### 工作原理

1. **任务创建**：主 Agent（Orchestrator）创建任务，指定 `assignedAgent` 和 `subagent`
2. **任务分发**：定时任务（每20秒）扫描待处理任务，分发给对应 subagent
3. **任务执行**：subagent 通过 `/api/tasks/{taskId}/context` 获取任务详情
4. **状态更新**：执行完成后更新任务状态为 `completed` 或 `failed`

### 任务字段

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | string | 任务唯一ID |
| title | string | 任务标题 |
| summary | string | 任务摘要 |
| status | string | pending/running/completed/failed |
| assignedAgent | string | 领取的 Agent |
| subagent | string | 分配的子代理 |
| visibility | string | shared/private |
| inputRefs | string[] | 输入引用 |
| outputRefs | string[] | 输出引用 |

---

## API 接口

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| GET | /api/tasks/:taskId | 获取任务详情 |
| PATCH | /api/tasks/:taskId | 更新任务 |
| POST | /api/tasks/:taskId/claim | 领取任务 |
| DELETE | /api/tasks/:taskId | 删除任务 |
| GET | /api/tasks/:taskId/context | 获取任务上下文 |

### 子代理管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/subagents | 获取子代理列表 |
| POST | /api/subagents | 创建子代理 |
| PATCH | /api/subagents/:id | 更新子代理 |
| DELETE | /api/subagents/:id | 删除子代理 |

---

## SubAgent 配置

### 创建 SubAgent

```bash
curl -X POST http://localhost:3333/api/subagents \
  -H "Content-Type: application/json" \
  -d '{
    "parentAgent": "dev-assistant",
    "name": "开发",
    "description": "负责开发任务",
    "tags": ["coding", "frontend"],
    "enabled": true
  }'
```

### SubAgent 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一ID |
| parentAgent | string | 所属主 Agent |
| name | string | 名称 |
| description | string | 描述 |
| tags | string[] | 标签 |
| enabled | boolean | 是否启用 |

---

## 定时任务

### 任务分发器

系统内置定时任务 `task-dispatcher`，每 20 秒执行一次：

1. 扫描 `pending` 状态任务
2. 检查是否有可用的 subagent
3. 分发任务给对应 subagent

### 手动触发

```bash
# 通过 cron API 触发
curl -X POST http://localhost:3333/api/cron/run \
  -H "Content-Type: application/json" \
  -d '{"jobId": "task-dispatcher"}'
```

---

## 工作流示例

### 1. 创建任务

```typescript
// 主 Agent 创建任务
const task = await fetch('http://localhost:3333/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "修复登录bug",
    summary: "用户反馈登录页无法跳转",
    assignedAgent: "developer",
    subagent: "开发",
    visibility: "shared",
    tags: ["bug", "frontend"]
  })
});
```

### 2. SubAgent 获取任务

```typescript
// SubAgent 获取完整上下文
const context = await fetch('http://localhost:3333/api/tasks/{taskId}/context', {
  headers: { 'X-Agent-Id': '开发' }
});
// 返回：任务详情 + 输入/输出 Artifact + 事件历史
```

### 3. 更新任务状态

```typescript
// 执行完成后更新状态
await fetch(`http://localhost:3333/api/tasks/${taskId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'completed',
    summary: '已修复登录跳转问题'
  })
});
```

---

## 集成检查清单

- [ ] 插件服务运行在指定端口（默认 3333）
- [ ] Gateway 路由配置正确
- [ ] 已配置 SubAgent
- [ ] 定时任务已启动
- [ ] 日志监控正常

---

## 常见问题

### Q: 任务分发失败怎么办？
A: 检查任务是否指定了 `subagent`，确认 subagent 状态为 `enabled`

### Q: 如何查看任务日志？
A: 通过 `/api/tasks/:taskId/events` 获取任务事件流

### Q: SubAgent 如何知道要做什么？
A: SubAgent 通过 `/api/tasks/:taskId/context` 获取任务的 `summary` 和 `artifact` 字段
