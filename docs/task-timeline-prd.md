# 任务流时间轴视图 PRD

> **项目**: claw-memory-plugin  
> **版本**: v2.0  
> **日期**: 2026-03-14

## 1. 背景与目标

### 背景
当前任务详情页包含"上下文模拟"调试功能，该功能主要用于开发调试，不适合生产环境使用。同时，现有界面缺少对任务执行时间线的可视化展示，难以直观理解任务的执行流程和 Agent 之间的调用关系。

### 目标
1. **移除上下文模拟功能**：删除任务详情页的调试功能，简化界面
2. **新增任务流时间轴视图**：可视化展示任务的创建、执行、完成/失败流程
3. **显示 Agent 任务进度**：实时展示各 Agent 的任务执行状态和进度
4. **支持任务分叉展示**：清晰展示 Root spawn subagent 等分叉场景

---

## 2. 功能列表

### 2.1 移除上下文模拟
- [ ] 删除任务详情页的"上下文模拟"区块
- [ ] 移除相关 props：`contextBundle`、`simulatedActor`、`onSimulatedActorChange`
- [ ] 清理相关状态和 API 调用

### 2.2 任务流时间轴视图
- **垂直时间轴布局**：从上到下展示任务时间线
- **节点类型**：
  - 任务创建节点（task_created）
  - 任务状态变更节点（task_updated / task_completed / task_failed）
  - 任务认领节点（task_claimed）
  - Artifact 保存节点（artifact_saved）
  - 上下文读取节点（context_read）
- **节点信息**：
  - 时间戳
  - 事件类型
  - 操作用户/Agent
  - 事件描述

### 2.3 任务分叉展示
- **Spawn 事件**：显示 "Agent X spawn Agent Y" 类型的节点
- **父子任务关系**：用分支线连接父任务和子任务
- **分支样式**：不同分支使用不同颜色或缩进区分

### 2.4 Agent 任务进度
- **Agent 状态卡片**：
  - Agent 名称和 ID
  - 当前状态（running / waiting / completed / failed / idle）
  - 关联的任务标题
  - 任务进度百分比（可选）
- **实时更新**：定时轮询或使用 WebSocket 刷新

---

## 3. 详细设计

### 3.1 移除上下文模拟

#### 后端变更
无

#### 前端变更
**task-detail.tsx**：
```typescript
// 移除的 props
type TaskDetailProps = {
  // ... 其他 props
  // 删除以下三项：
  // contextBundle: ContextBundle | null;
  // simulatedActor: string;
  // onSimulatedActorChange: (value: string) => void;
};
```

**区块移除**：
- 删除"上下文模拟"卡片（包含 actor、access、mode、summary、suggestedRefs）
- 保留"输入/输出引用"区块（精简显示）

### 3.2 时间轴视图组件

#### 组件结构
```
TaskTimeline/
├── TaskTimeline.tsx        # 主容器
├── TimelineNode.tsx        # 单个节点
├── TimelineBranch.tsx      # 分支连接线
└── index.ts               # 导出
```

#### 数据结构
```typescript
type TimelineEvent = {
  eventId: string;
  timestamp: string;        // ISO 时间
  type: TaskEventType;
  actor?: string;          // Agent 名称
  message: string;         // 事件描述
  metadata?: Record<string, unknown>;
  parentEventId?: string;  // 用于分支关联
};

type TimelineNode = {
  event: TimelineEvent;
  children: TimelineNode[]; // 子节点（分支）
  status?: TaskStatus;     // 当前任务状态
};
```

#### 渲染逻辑
1. 从 TaskEvent 列表构建树结构
2. 按时间顺序垂直排列
3. 分支节点向右缩进并用连接线标识

### 3.3 Agent 进度组件

#### 组件结构
```
AgentProgress/
├── AgentProgressCard.tsx   # 单个 Agent 卡片
├── AgentProgressList.tsx  # Agent 列表容器
└── index.ts               # 导出
```

#### API 复用
- 复用现有 `GET /api/agents` 获取 Agent 列表
- 复用现有 `GET /api/agents/events` 获取实时事件

#### 显示逻辑
```typescript
type AgentWithTask = {
  agent: AgentRecord;
  currentTask?: {
    title: string;
    status: TaskStatus;
    progress?: number;
  };
};
```

---

## 4. 页面布局

### 4.1 任务详情页（移除上下文模拟后）

```
┌─────────────────────────────────────────────────────┐
│  任务详情                              [状态标签]    │
├─────────────────────────────────────────────────────┤
│  基本信息                                            │
│  ─────────                                          │
│  Task ID: task_xxx                                  │
│  Agent: planner-agent                               │
│  可见性: 共享                                       │
│  领取者: agent:planner:subagent:xxx                │
│                                                     │
│  [领取任务] [释放任务]                               │
├─────────────────────────────────────────────────────┤
│  任务信息                                            │
│  ─────────                                          │
│  标题: [只读]                                       │
│  状态: [下拉选择]                                   │
│  摘要: [可编辑文本域]                               │
├─────────────────────────────────────────────────────┤
│  输入/输出引用                                       │
│  ──────────────────                                 │
│  输入引用: [tag1] [tag2]                            │
│  输出引用: [tag3]                                   │
├─────────────────────────────────────────────────────┤
│  子任务                                              │
│  ─────                                              │
│  • [状态] [Agent] 子任务标题                         │
│  • [状态] [Agent] 子任务标题                         │
├─────────────────────────────────────────────────────┤
│  任务流时间轴                                        │
│  ─────────────                                      │
│  │ ● 10:00 创建任务 - root                         │
│  │ │                                                │
│  │ ├─● 10:01 任务被领取 - planner                 │
│  │ │                                                │
│  │ ├─● 10:02 spawn subagent - planner             │
│  │ │   │                                            │
│  │ │   ├─● 10:03 执行任务 - developer             │
│  │ │   │                                            │
│  │ │   └─● 10:05 任务完成 - developer             │
│  │ │                                                │
│  │ └─● 10:06 任务完成 - planner                   │
│  └──────                                            │
├─────────────────────────────────────────────────────┤
│  Artifact 内容                                       │
│  ────────────                                       │
│  [可编辑文本域]                                      │
│                                                     │
│  [保存记录]                                          │
└─────────────────────────────────────────────────────┘
```

### 4.2 Agent 进度面板（可选：作为独立标签页或侧边栏）

```
┌──────────────────────────────┐
│  Agent 任务进度               │
├──────────────────────────────┤
│  ● root (running)            │
│    当前任务: 任务规划         │
│    状态: 运行中               │
├──────────────────────────────┤
│  ├─● planner (running)       │
│  │   当前任务: 拆分任务       │
│  │   状态: 运行中             │
│  │                            │
│  └─● developer (waiting)     │
│      当前任务: 待分配         │
│      状态: 等待中             │
└──────────────────────────────┘
```

---

## 5. API 设计

### 5.1 复用现有 API

| API | 用途 |
|-----|------|
| GET /api/tasks/:taskId | 获取任务详情 |
| GET /api/tasks/:taskId/events | 获取任务事件 |
| GET /api/tasks/:taskId/children | 获取子任务 |
| GET /api/agents | 获取 Agent 列表 |
| GET /api/agents/events | 获取 Agent 事件 |

### 5.2 新增 API（可选）

#### GET /api/tasks/:taskId/timeline
获取任务时间轴数据（后端构建好树结构）

**响应**：
```json
{
  "timeline": {
    "root": {
      "event": { ... },
      "children": [
        {
          "event": { ... },
          "children": []
        }
      ]
    }
  }
}
```

---

## 6. 实施计划

### Phase 1: 移除上下文模拟
- [ ] 修改 TaskDetailProps 类型定义
- [ ] 删除 contextBundle 相关渲染代码
- [ ] 移除 simulatedActor 状态
- [ ] 清理相关 API 调用（如果有）

### Phase 2: 时间轴视图
- [ ] 创建 TaskTimeline 组件
- [ ] 实现 TimelineNode 组件
- [ ] 实现 TimelineBranch 组件
- [ ] 实现事件树构建逻辑
- [ ] 集成到任务详情页

### Phase 3: Agent 进度
- [ ] 创建 AgentProgressCard 组件
- [ ] 创建 AgentProgressList 组件
- [ ] 实现 Agent 与任务关联逻辑
- [ ] 添加实时刷新机制

### Phase 4: 样式与交互
- [ ] 完善时间轴样式
- [ ] 添加动画效果
- [ ] 响应式适配

---

## 7. 验收标准

### 7.1 移除上下文模拟
- [ ] 任务详情页不再显示"上下文模拟"区块
- [ ] 任务基本信息、任务信息、子任务、事件列表、Artifact 等功能正常

### 7.2 任务流时间轴
- [ ] 垂直时间轴正确渲染
- [ ] 节点显示时间、事件类型、Agent
- [ ] 分叉用缩进和连接线表示
- [ ] 事件按时间顺序排列

### 7.3 Agent 任务进度
- [ ] 显示所有活跃 Agent
- [ ] 显示 Agent 当前状态
- [ ] 显示 Agent 关联的任务标题
- [ ] 状态实时更新

### 7.4 整体体验
- [ ] 页面加载流畅
- [ ] 交互响应及时
- [ ] 样式美观一致

---

## 8. 依赖项

- 现有 TaskEvent 类型定义
- 现有 AgentRecord 类型定义
- 现有 API 路由（tasks、agents）
- 现有组件架构

---

## 9. 风险与注意事项

1. **时间轴数据量大**：如果任务事件过多，需要考虑分页或虚拟滚动
2. **实时性**：需要平衡轮询频率和服务器压力
3. **兼容性**：移除上下文模拟是否影响现有功能需要验证
