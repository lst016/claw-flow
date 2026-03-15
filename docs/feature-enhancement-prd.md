# 记忆插件功能增强 PRD

> **项目**: claw-memory-plugin  
> **版本**: v3.0  
> **日期**: 2026-03-14  
> **状态**: 规划中

---

## 1. 背景与目标

### 1.1 背景

当前 claw-memory-plugin 已经实现了核心的任务管理能力，包括：
- 任务卡 CRUD
- Artifact 存储
- Task Events 事件流
- Claim / Lease 任务领取机制
- Context Bundle 上下文打包
- 任务可见性控制

但随着系统复杂度提升，现有功能已无法满足以下需求：
1. **实时性不足**：前端需要手动刷新才能看到最新数据
2. **筛选能力弱**：无法按状态、Agent、时间范围筛选任务列表
3. **批量操作缺失**：无法批量更新或删除任务
4. **缺乏统计分析**：无法了解任务完成率、平均耗时等指标
5. **任务关联薄弱**：缺少父子关系和依赖关系的可视化与强制约束
6. **通知机制缺失**：任务状态变化无法主动通知
7. **事件手动记录**：需要手动调用 API 记录事件，容易遗漏

### 1.2 目标

本次功能增强旨在打造一个**实时、可视化、可协作**的任务管理插件，具体目标：

| 目标 | 描述 |
|------|------|
| 实时刷新 | 支持 WebSocket 推送或轮询，页面数据自动更新 |
| 任务筛选 | 支持按状态、Agent、时间、关键词筛选任务 |
| 批量操作 | 支持批量更新状态、批量删除任务 |
| 统计分析 | 展示完成率、平均耗时、各状态分布图表 |
| 任务关联 | 支持父子任务关系、任务依赖声明与检测 |
| 提醒通知 | 任务状态变化时推送通知（WebSocket 通知） |
| 自动事件 | 创建/更新任务时自动生成对应事件，无需手动调用 |

---

## 2. 功能列表

### 2.1 实时刷新

- [ ] **WebSocket 服务端**：在 Next.js 服务端集成 WebSocket（使用 `ws` 或 `socket.io`）
- [ ] **WebSocket 客户端**：前端建立持久连接，接收实时推送
- [ ] **事件广播**：任务创建、更新、删除、Artifact 保存等操作时广播事件
- [ ] **心跳机制**：WebSocket 心跳检测连接状态
- [ ] **轮询降级**：WebSocket 不可用时自动降级为 HTTP 轮询
- [ ] **连接状态 UI**：前端显示连接状态（已连接/重连中/断开）

### 2.2 任务筛选

- [ ] **状态筛选**：多选下拉框，支持 pending / running / completed / failed
- [ ] **Agent 筛选**：下拉选择 assignedAgent / claimedBy
- [ ] **时间筛选**：日期范围选择器（创建时间 / 更新时间）
- [ ] **关键词搜索**：模糊匹配任务标题和摘要
- [ ] **标签筛选**：多选标签筛选
- [ ] **组合筛选**：支持多条件组合，所有条件为 AND 关系
- [ ] **筛选结果计数**：显示筛选后的任务数量

### 2.3 批量操作

- [ ] **任务列表多选**： checkbox 选择任务，支持全选/反选
- [ ] **批量更新状态**：选择目标状态，一键批量更新
- [ ] **批量删除**：确认对话框，批量删除任务
- [ ] **批量分配 Agent**：批量分配任务给指定 Agent
- [ ] **批量添加标签**：批量添加/移除标签
- [ ] **操作结果反馈**：显示成功/失败数量和详情

### 2.4 统计分析

- [ ] **任务完成率**：已完成任务数 / 总任务数（百分比 + 图表）
- [ ] **平均耗时**：从创建到完成（仅计算 completed 任务）的平均时间
- [ ] **状态分布图**：饼图或条形图展示各状态任务数量
- [ ] **时间趋势图**：折线图展示每日/每周任务创建量、完成量
- [ ] **Agent 统计**：各 Agent 完成任务数量排行
- [ ] **统计时间范围**：支持选择时间范围（近7天/近30天/自定义）
- [ ] **实时更新**：统计数据随任务变化实时更新

### 2.5 任务关联

- [ ] **父子任务关系**：
  - 创建任务时可指定 parentTaskId
  - 任务详情页显示父任务链接
  - 子任务列表展示
  - 父任务详情页展示所有子任务
- [ ] **任务依赖关系**：
  - 任务可声明 dependsOn（依赖的其他任务）
  - 依赖检测：被依赖任务未完成时显示警告
  - 依赖可视化：依赖关系图（可选）
  - 阻塞提示：依赖任务失败时提示
- [ ] **任务链展示**：任务列表支持展示父子/依赖关系缩进

### 2.6 提醒通知

- [ ] **WebSocket 通知**：通过 WebSocket 推送通知
- [ ] **通知类型**：
  - task_created：新任务创建
  - task_updated：任务状态更新
  - task_completed：任务完成
  - task_failed：任务失败
  - task_assigned：任务被分配
  - task_claimed：任务被领取
  - dependency_blocked：依赖任务未完成
- [ ] **通知中心**：前端页面内置通知列表
- [ ] **通知过滤**：可按通知类型筛选
- [ ] **已读状态**：标记通知为已读
- [ ] **通知设置**（可选）：用户可配置接收哪些通知

### 2.7 自动记录事件

- [ ] **task_created 事件**：POST /api/tasks 创建任务时自动生成
- [ ] **task_updated 事件**：PATCH /api/tasks 更新任务时自动生成（状态变化时）
- [ ] **task_completed 事件**：状态变更为 completed 时自动生成
- [ ] **task_failed 事件**：状态变更为 failed 时自动生成
- [ ] **artifact_saved 事件**：POST /api/tasks/:taskId/artifact 时自动生成
- [ ] **事件去重**：避免连续状态变更生成重复事件
- [ ] **可配置**：可通过配置关闭自动事件（可选）

---

## 3. 详细设计

### 3.1 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Next.js)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │  任务列表页  │  │  任务详情页  │  │     统计分析页         │   │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘   │
│         │                │                     │                  │
│  ┌──────┴────────────────┴─────────────────────┴─────────────┐   │
│  │                    WebSocket Client                       │   │
│  │   - 连接管理   - 事件订阅   - 状态显示   - 降级轮询         │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────┼────────────────────────────────────┐
│                         后端 (Next.js API)                       │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                    WebSocket Server                      │   │
│  │   - 任务广播   - 通知推送   - 心跳检测                    │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                    │
│  ┌────────────┐  ┌──────────┴───────┐  ┌────────────────────┐   │
│  │  Store    │  │    API Routes    │  │   统计分析服务      │   │
│  │ (Memory/  │  │  - /api/tasks    │  │   - 聚合查询        │   │
│  │  Redis)   │  │  - /api/agents   │  │   - 计时统计        │   │
│  └───────────┘  │  - /api/stats    │  └────────────────────┘   │
│                 └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 数据库模型扩展

#### 3.2.1 任务依赖扩展

```typescript
// lib/types/task.ts 新增
export type TaskDependency = {
  dependsOnTaskId: string;  // 依赖的任务 ID
  blockingStatus?: TaskStatus[];  // 阻塞状态，默认 [pending, running]
};

export type TaskRecord = {
  // ... 现有字段
  parentTaskId?: string;          // 已有
  // 新增字段
  childTaskIds?: string[];        // 子任务 ID 列表（反向引用）
  dependencies?: TaskDependency[];  // 依赖列表
  dependsOnMe?: string[];        // 依赖此任务的任务（反向引用）
};
```

#### 3.2.2 通知模型

```typescript
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
```

#### 3.2.3 统计模型

```typescript
export type TaskStats = {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  completionRate: number;
  averageDurationMs: number;
  createdToday: number;
  completedToday: number;
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
};
```

### 3.3 API 设计

#### 3.3.1 任务列表（带筛选）

```
GET /api/tasks?status=running,pending&agent=planner&from=2026-01-01&to=2026-03-14&search=登录&tags=auth&page=1&limit=20
```

**Query Parameters**:
| 参数 | 类型 | 描述 |
|------|------|------|
| status | string[] | 状态筛选，逗号分隔 |
| agent | string | Agent 名称筛选 |
| from | string | 创建时间起始 (ISO date) |
| to | string | 创建时间结束 |
| search | string | 关键词搜索 |
| tags | string[] | 标签筛选 |
| parentTaskId | string | 筛选子任务 |
| page | number | 页码 |
| limit | number | 每页数量 |

**Response**:
```json
{
  "tasks": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "filters": {
    "status": ["running", "pending"],
    "agent": "planner",
    "from": "2026-01-01",
    "to": "2026-03-14",
    "search": "登录",
    "tags": ["auth"]
  }
}
```

#### 3.3.2 批量操作

```
POST /api/tasks/batch
```

**Request**:
```json
{
  "taskIds": ["task_001", "task_002", "task_003"],
  "action": "update_status" | "delete" | "assign_agent" | "add_tags" | "remove_tags",
  "payload": {
    "status": "completed",
    "agent": "developer",
    "tags": ["done"]
  }
}
```

**Response**:
```json
{
  "success": ["task_001", "task_002"],
  "failed": [
    { "taskId": "task_003", "error": "任务不存在" }
  ]
}
```

#### 3.3.3 统计分析

```
GET /api/stats?from=2026-01-01&to=2026-03-14&agent=all
```

**Response**:
```json
{
  "summary": {
    "total": 150,
    "pending": 20,
    "running": 10,
    "completed": 100,
    "failed": 20,
    "completionRate": 0.67,
    "averageDurationMs": 3600000
  },
  "byAgent": {
    "planner": { "total": 50, "completed": 40, "failed": 5 },
    "developer": { "total": 80, "completed": 50, "failed": 10 }
  },
  "byDay": [
    { "date": "2026-03-14", "created": 10, "completed": 8, "failed": 1 }
  ]
}
```

#### 3.3.4 任务依赖

```
GET /api/tasks/:taskId/dependencies
```

**Response**:
```json
{
  "dependencies": [
    {
      "taskId": "task_parent_001",
      "title": "父任务",
      "status": "completed"
    },
    {
      "taskId": "task_dep_001",
      "title": "依赖任务A",
      "status": "pending",
      "isBlocking": true
    }
  ],
  "dependents": [
    {
      "taskId": "task_child_001",
      "title": "子任务",
      "status": "pending"
    }
  ]
}
```

#### 3.3.5 通知列表

```
GET /api/notifications?type=task_updated&isRead=false&limit=20
```

**Response**:
```json
{
  "notifications": [
    {
      "notificationId": "notif_001",
      "type": "task_updated",
      "taskId": "task_001",
      "taskTitle": "实现登录",
      "message": "任务状态更新为 running",
      "actor": "planner",
      "isRead": false,
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

```
PATCH /api/notifications/:notificationId/read
```

#### 3.3.6 WebSocket 消息协议

**客户端订阅**:
```json
{
  "type": "subscribe",
  "channels": ["tasks", "notifications", "agents"]
}
```

**服务端推送**:
```json
{
  "channel": "tasks",
  "event": "task_updated",
  "data": {
    "taskId": "task_001",
    "status": "completed",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

```json
{
  "channel": "notifications",
  "event": "new",
  "data": {
    "notificationId": "notif_001",
    "type": "task_updated",
    "message": "任务状态更新"
  }
}
```

### 3.4 前端组件设计

#### 3.4.1 任务列表页增强

```
┌─────────────────────────────────────────────────────────────────┐
│  任务列表                                    [+ 新建任务]        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 搜索任务...                    │ [状态 ▼] [Agent ▼]   ││
│  │                                                      [筛选] ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☑ 全选  │ 状态 │ Agent │ 标题          │ 时间    │ 操作   ││
│  │ ────────┼──────┼───────┼───────────────┼─────────┼────────││
│  │ ☐       │ 🟢   │ root  │ 任务规划      │ 10:00   │ ⋯     ││
│  │ ☐       │ 🔵   │ dev   │ 实现登录接口  │ 09:30   │ ⋯     ││
│  │ ☐       │ 🔴   │ test  │ 修复Bug      │ 昨天    │ ⋯     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  已选择 3 项: [批量更新状态 ▼] [批量删除] [批量分配]            │
│                                                                 │
│  共 100 条记录  [< 1 2 3 ... 10 >]                             │
└─────────────────────────────────────────────────────────────────┘
```

**新增组件**:
- `TaskFilters.tsx` - 筛选器组件
- `TaskTable.tsx` - 任务表格（支持多选）
- `BatchActions.tsx` - 批量操作栏

#### 3.4.2 统计分析页

```
┌─────────────────────────────────────────────────────────────────┐
│  统计分析                            [近7天 ▼] [近30天] [自定义]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 总任务数      │ │ 完成率        │ │ 平均耗时      │            │
│  │    150       │ │    67%       │ │   1小时      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     任务状态分布                           │  │
│  │     ████████████░░░░░░░░░░░░░░░░░░░░░░░░ (completed)     │  │
│  │     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (failed)       │  │
│  │     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (running)      │  │
│  │     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (pending)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     任务趋势                               │  │
│  │     折线图: 创建量 / 完成量 / 失败量                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Agent 排行                            │  │
│  │     1. planner - 完成 40 / 失败 5                         │  │
│  │     2. developer - 完成 50 / 失败 10                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**新增组件**:
- `StatsOverview.tsx` - 统计概览卡片
- `StatusDistribution.tsx` - 状态分布图
- `TaskTrendChart.tsx` - 任务趋势图
- `AgentRanking.tsx` - Agent 排行

#### 3.4.3 任务详情页增强

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 返回    任务详情                         [状态: completed]    │
├─────────────────────────────────────────────────────────────────┤
│  基本信息                                                        │
│  ─────────                                                      │
│  Task ID: task_xxx                        父任务: [任务A ▼]    │
│  Agent: developer                        依赖任务: [任务B ▼]   │
│  创建时间: 2026-03-14 10:00                                    │
│  完成时间: 2026-03-14 11:30 (耗时: 1h30m)                     │
│                                                                 │
│  [领取任务] [释放任务] [删除]                                   │
├─────────────────────────────────────────────────────────────────┤
│  依赖检测                                                        │
│  ─────────                                                      │
│  ✅ 依赖任务A - 已完成                                          │
│  ✅ 依赖任务B - 已完成                                          │
│  ⚠️ 任务C 依赖此任务，状态: pending (阻塞中)                    │
├─────────────────────────────────────────────────────────────────┤
│  子任务列表                                                      │
│  ────────                                                      │
│  • [✅] [dev] 子任务1                                           │
│  • [🔵] [test] 子任务2                                          │
├─────────────────────────────────────────────────────────────────┤
│  时间轴 (实时更新)                                              │
│  ──────────────                                                │
│  │ ● 10:00 创建任务 - root                                   │
│  │ │                                                        │
│  │ ├─● 10:01 任务被领取 - planner                           │
│  │ │                                                        │
│  │ └─● 10:05 任务完成 - developer                           │
│  └──────                                                        │
└─────────────────────────────────────────────────────────────────┘
```

**新增组件**:
- `DependencyChecker.tsx` - 依赖检测组件
- `TaskTimer.tsx` - 任务耗时计时器
- `SubtaskList.tsx` - 子任务列表

#### 3.4.4 通知中心

```
┌─────────────────────────────────────────────────────────────────┐
│  通知中心                                           [全部已读]   │
├─────────────────────────────────────────────────────────────────┤
│  🔵 [未读] 任务状态更新 - "实现登录" 状态变更为 running        │
│           10:00 - by planner                                   │
├─────────────────────────────────────────────────────────────────┤
│  ⚪ [已读] 任务创建 - "新任务" 被创建                           │
│           昨天 - by root                                        │
├─────────────────────────────────────────────────────────────────┤
│  ⚪ [已读] 依赖阻塞 - "子任务" 依赖 "任务A" 未完成               │
│           昨天                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**新增组件**:
- `NotificationCenter.tsx` - 通知中心
- `NotificationItem.tsx` - 通知项

### 3.5 自动事件机制

#### 3.5.1 事件自动生成逻辑

```typescript
// 在 store 层实现自动事件
class MemoryStore implements Store {
  
  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const task = await this.doCreateTask(input);
    
    // 自动生成 task_created 事件
    await this.createTaskEvent({
      taskId: task.taskId,
      type: "task_created",
      actor: input.assignedAgent || "system",
      message: `任务 "${task.title}" 已创建`,
      metadata: { status: task.status }
    });
    
    return task;
  }
  
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRecord> {
    const oldTask = await this.getTask(taskId);
    const task = await this.doUpdateTask(taskId, input);
    
    // 检测状态变化
    if (input.status && input.status !== oldTask.status) {
      let eventType: TaskEventType;
      let eventMessage: string;
      
      if (input.status === "completed") {
        eventType = "task_completed";
        eventMessage = `任务 "${task.title}" 已完成`;
      } else if (input.status === "failed") {
        eventType = "task_failed";
        eventMessage = `任务 "${task.title}" 已失败`;
      } else {
        eventType = "task_updated";
        eventMessage = `任务状态更新为 ${input.status}`;
      }
      
      await this.createTaskEvent({
        taskId: task.taskId,
        type: eventType,
        actor: "system",
        message: eventMessage,
        metadata: { oldStatus: oldTask.status, newStatus: input.status }
      });
    }
    
    return task;
  }
  
  async saveArtifact(taskId: string, input: SaveArtifactInput): Promise<Artifact> {
    const artifact = await this.doSaveArtifact(taskId, input);
    
    // 自动生成 artifact_saved 事件
    await this.createTaskEvent({
      taskId,
      type: "artifact_saved",
      actor: input.sourceAgent || "system",
      message: `保存 Artifact: ${input.summary || input.type}`,
      metadata: { artifactId: artifact.artifactId, type: artifact.type }
    });
    
    return artifact;
  }
}
```

---

## 4. 页面布局

### 4.1 任务列表页

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Claw 记忆插件                    [🔔 5] [👤]           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                 │
│  │ 📋 任务列表 │  统计分析                                       │
│  └─────────────┘                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 搜索任务标题或摘要...                                    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 状态    [全部 ▼]     Agent    [全部 ▼]      时间范围        ││
│  │ 标签    [选择...]    父任务   [选择...]                    ││
│  │                                     [重置] [应用筛选]      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  已选 3 项 ▾                              [批量更新▸] [删除]   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ☐ │ 状态  │ Agent   │ 标题           │ 标签 │ 更新时间   │ │
│  │───│───────│─────────│────────────────│──────│────────────│ │
│  │ ☑ │ 🟢    │ root    │ 任务规划       │ plan │ 10:30      │ │
│  │ ☐ │ 🔵    │ dev     │ 实现登录接口   │ auth │ 09:15      │ │
│  │ ☑ │ 🔴    │ test    │ 修复Bug        │ bug  │ 昨天       │ │
│  │ ☐ │ ⚪    │ -       │ 子任务1        │ -    │ 昨天       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  共 156 条记录  │  当前页 1/16  │  [<] [1] [2] [3] [>] [>>]    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 统计分析页

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Claw 记忆插件                    [🔔 5] [👤]           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                 │
│  │ 📋 任务列表 │  统计分析                                       │
│  └─────────────┘                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  时间范围: [近7天 ▼]  自定义: [2026-01-01] - [2026-03-14]       │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ 📊 总任务   │ │ ✅ 完成率    │ │ ⏱️ 平均耗时  │ │ 📈 今日新增 │ │
│  │    156     │ │    67%      │ │   1h23m    │ │     12     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                 │
│  ┌──────────────────────────────┐ ┌───────────────────────────┐ │
│  │     任务状态分布              │ │      任务趋势             │ │
│  │  ┌────────────────────────┐  │ │    📈 折线图             │ │
│  │  │   饼图/环形图           │  │ │                           │ │
│  │  │   pending: 20 (13%)    │  │ │  ─── 创建量              │ │
│  │  │   running: 15 (10%)     │  │ │  ─── 完成量              │ │
│  │  │   completed: 104 (67%)  │  │ │                           │ │
│  │  │   failed: 17 (11%)      │  │ │                           │ │
│  │  └────────────────────────┘  │ │                           │ │
│  └──────────────────────────────┘ └───────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Agent 任务排行                         ││
│  │  🥇 planner      完成 45  /  失败 3    (完成率 94%)         ││
│  │  🥈 developer    完成 38  /  失败 8    (完成率 83%)         ││
│  │  🥉 tester       完成 21  /  失败 6    (完成率 78%)         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 实施计划

### Phase 1: 基础设施（WebSocket + 自动事件）

- [ ] 集成 WebSocket 服务端
- [ ] 集成 WebSocket 客户端
- [ ] 实现任务事件自动生成（create/update）
- [ ] 实现 WebSocket 广播机制

**预计工期**: 3 天

### Phase 2: 任务筛选

- [ ] 后端筛选 API 实现
- [ ] 前端筛选组件开发
- [ ] 搜索功能实现
- [ ] 分页优化

**预计工期**: 2 天

### Phase 3: 批量操作

- [ ] 后端批量 API 实现
- [ ] 前端多选功能
- [ ] 批量操作 UI
- [ ] 操作确认对话框

**预计工期**: 2 天

### Phase 4: 统计分析

- [ ] 统计 API 实现
- [ ] 前端统计页面
- [ ] 图表组件集成
- [ ] 实时更新

**预计工期**: 2 天

### Phase 5: 任务关联

- [ ] 父子任务关系支持
- [ ] 依赖关系支持
- [ ] 依赖检测逻辑
- [ ] 依赖可视化

**预计工期**: 2 天

### Phase 6: 通知系统

- [ ] 通知模型设计
- [ ] 通知 API 实现
- [ ] 通知中心 UI
- [ ] 已读状态管理

**预计工期**: 2 天

### Phase 7: 收尾与优化

- [ ] 样式优化
- [ ] 响应式适配
- [ ] 性能优化
- [ ] 文档更新

**预计工期**: 1 天

---

## 6. 验收标准

### 6.1 实时刷新

- [ ] WebSocket 连接稳定，断线自动重连
- [ ] 任务创建/更新/删除后，列表页自动刷新
- [ ] 页面显示连接状态
- [ ] WebSocket 不可用时自动降级为轮询

### 6.2 任务筛选

- [ ] 支持按状态、Agent、时间、关键词筛选
- [ ] 筛选结果正确
- [ ] 筛选条件可重置
- [ ] 筛选结果分页正常

### 6.3 批量操作

- [ ] 支持多选任务
- [ ] 批量更新状态成功
- [ ] 批量删除成功（有确认）
- [ ] 操作结果反馈清晰

### 6.4 统计分析

- [ ] 完成率计算正确
- [ ] 平均耗时计算正确
- [ ] 状态分布图正确显示
- [ ] 时间趋势图正确显示

### 6.5 任务关联

- [ ] 可创建子任务
- [ ] 可设置依赖任务
- [ ] 依赖未完成时有提示
- [ ] 子任务列表正确显示

### 6.6 通知系统

- [ ] 任务状态变化生成通知
- [ ] 通知中心显示正确
- [ ] 可标记已读
- [ ] 未读数实时更新

### 6.7 自动事件

- [ ] 创建任务自动生成 task_created
- [ ] 更新状态自动生成 task_updated/completed/failed
- [ ] 保存 Artifact 自动生成 artifact_saved
- [ ] 事件不重复生成

---

## 7. 风险与注意事项

1. **WebSocket 扩展性**：当前为单实例，生产环境需考虑 Redis Pub/Sub 或独立 WebSocket 服务
2. **大数据量**：任务/事件过多时需考虑分页和虚拟滚动
3. **实时性与一致性**：WebSocket 推送和数据库写入需保证顺序
4. **依赖循环**：任务依赖需检测循环引用
5. **权限控制**：批量操作需注意权限隔离

---

## 8. 附录

### 8.1 环境变量

```bash
# WebSocket
WS_PORT=3334
WS_HEARTBEAT_INTERVAL=30000

# 统计
STATS_DEFAULT_DAYS=7

# 通知
NOTIFICATION_RETENTION_DAYS=30
```

### 8.2 相关文件

- `lib/types/task.ts` - 类型定义
- `lib/store/memory-store.ts` - 内存存储
- `lib/store/redis-store.ts` - Redis 存储
- `app/api/tasks/` - 任务 API
- `components/` - 前端组件
