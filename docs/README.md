# Claw 任务分发系统使用指南

## 概述

本系统是一个 **多代理任务分发平台**，用于协调多个根 Agent 及其子 Agent (SubAgent) 执行任务。

---

## 核心概念

### 1. 根 Agent (Root Agent)

根 Agent 是任务的直接管理者，目前支持：

| Agent | 用途 |
|-------|------|
| `dev-assistant` | 开发任务 |
| `main` | 主任务 |
| `creator` | 创作任务 |
| `yunying` | 运营任务 |

### 2. 子 Agent (SubAgent)

SubAgent 是根 Agent 下的具体执行者，例如：

```
dev-assistant
  ├── 开发   (负责编码任务)
  ├── 测试   (负责测试任务)
  └── 设计   (负责 UI/UX 设计)

main
  ├── 运营   (负责运营任务)
  └── 写作   (负责内容创作)
```

### 3. 任务 (Task)

任务是对应具体工作的单元：

```json
{
  "taskId": "task_xxx",
  "title": "实现用户登录功能",
  "assignedAgent": "dev-assistant",
  "subagent": "开发",
  "status": "pending",
  "summary": "实现前后端登录接口..."
}
```

---

## 使用流程

### 步骤 1: 配置 SubAgent

在 **SubAgent** 标签页中配置子代理：

1. 点击「新增 SubAgent」
2. 填写配置：
   - **所属根 Agent**: 选择根 Agent (如 dev-assistant)
   - **名称**: 子 Agent 名称 (如 开发、测试、设计)
   - **描述**: 可选描述
   - **标签**: 可选标签
3. 点击保存

### 步骤 2: 创建任务

在 **创建任务** 标签页中创建新任务：

1. 填写任务信息：
   - **任务标题**: 任务名称
   - **摘要快照**: 给调度器的简短描述
   - **执行 Agent (根)**: 填写根 Agent (如 dev-assistant)
   - **子 Agent (可选)**: 填写 SubAgent 名称 (如 开发)
2. 点击「新建任务」

### 步骤 3: 自动分发

调度器每 20 秒扫描待处理任务：

1. 发现 `status=pending` 的任务
2. 根据 `assignedAgent` + `subagent` 启动对应 Agent
3. subagent 自行读取任务详情并执行
4. 执行完成后自动关闭

---

## 架构图

```
                    ┌─────────────────────┐
                    │   调度器 (Cron)     │
                    │   每 20 秒触发       │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ dev-     │   │   main   │   │ creator  │
        │ assistant│   │          │   │          │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ 开发     │   │ 运营     │   │ 文案     │
        │ 测试     │   │ 写作     │   │ 设计     │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 任务生命周期

```
pending ──(调度器分发)──▶ running ──(完成)──▶ completed
  │                            │
  │                            │
  └────────(失败)──────────────▶ failed
```

---

## API 参考

### 任务 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表 |
| POST | `/api/tasks` | 创建任务 |
| GET | `/api/tasks/[taskId]` | 获取任务详情 |
| GET | `/api/tasks/[taskId]/context` | 获取任务完整上下文 |
| POST | `/api/tasks/[taskId]/claim` | 领取任务 |
| PATCH | `/api/tasks/[taskId]` | 更新任务 |

### SubAgent API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subagents` | 获取 SubAgent 列表 |
| POST | `/api/subagents` | 创建 SubAgent |
| GET | `/api/subagents/[id]` | 获取 SubAgent 详情 |
| PATCH | `/api/subagents/[id]` | 更新 SubAgent |
| DELETE | `/api/subagents/[id]` | 删除 SubAgent |

---

## 常见问题

### Q: subagent 字段是必须的吗？

A: 不是必须的。如果没有填写 subagent，调度器会启动根 Agent 来执行任务。

### Q: 任务创建后需要手动分发吗？

A: 不需要。调度器会自动每 20 秒扫描待处理任务并分发。

### Q: subagent 如何获取任务详情？

A: subagent 启动时会收到 taskId，然后自行调用 `/api/tasks/{taskId}/context` 获取完整信息。这样可以避免上下文污染。

### Q: 可以同时运行多个 subagent 吗？

A: 可以。调度器会为每个待处理任务启动一个独立的 subagent。

---

## 最佳实践

1. **保持任务简洁**: 一个任务只做一件事
2. **合理设置 subagent**: 根据技能分配任务
3. **使用摘要**: 在 summary 中提供足够的上下文信息
4. **及时标记状态**: 任务完成后会自动更新状态

---

## 更新日志

- **2026-03-15**: 初始版本，支持 SubAgent 配置和自动分发
