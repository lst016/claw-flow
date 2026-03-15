# ClawFlow 任务层级改进规划

> **项目**: claw-memory-plugin  
> **版本**: v4.0  
> **日期**: 2026-03-14  
> **状态**: 规划中

---

## 1. 背景与目标

### 1.1 背景

当前 claw-memory-plugin 已经支持了父子任务关系（`parentTaskId`、`childTaskIds`），但仍存在以下不足：

1. **Agent 层级不明确**：现有数据模型只有 `assignedAgent`，无法区分 Agent 的角色级别（Root / Planner / Developer / Tester）
2. **任务链路不透明**：虽然支持父子任务，但无法直观展示"大 Agent 调度小 Agent"的多级链路
3. **任务树展示缺失**：前端缺少树形视图，无法直观看到任务的层级结构
4. **Agent 关系弱**：任务和 Agent 之间的层级关系没有显式关联

### 1.2 目标

本次改进旨在打造**多级 Agent 任务链路**系统：

| 目标 | 描述 |
|------|------|
| Agent 级别区分 | 在数据模型和 UI 上明确区分 Root / Planner / Developer / Tester |
| 多级任务链路 | 支持大 Agent → 小 Agent 的多级任务分配关系 |
| 完整任务树显示 | 前端树形视图展示完整任务层级 |
| Agent 任务视图 | 按 Agent 级别筛选和展示任务 |

---

## 2. 需求分析

### 2.1 Agent 级别定义

| 级别 | 标识 | 说明 | 权限 |
|------|------|------|------|
| Root | `root` | 最高级别，负责接收需求和分发任务 | 所有权限 |
| Planner | `planner` | 任务规划者，负责拆解任务 | 创建子任务、分配给下级 |
| Developer | `developer` | 开发者，负责具体实现 | 执行被分配的任务 |
| Tester | `tester` | 测试者，负责验证结果 | 标记任务完成/失败 |

### 2.2 多级任务链路示例

```
root (god)
  │
  ├── Planner: 任务规划
  │     │
  │     ├── Developer: 前端开发
  │     │     └── (子任务: 实现登录页面)
  │     │
  │     ├── Developer: 后端开发
  │     │     └── (子任务: 实现登录接口)
  │     │
  │     └── Tester: 测试验证
  │           └── (子任务: 登录流程测试)
  │
  └── Planner: 需求分析
        │
        └── Developer: 文档编写
              └── (子任务: 编写 API 文档)
```

### 2.3 任务树展示

前端需要展示类似以下的树形结构：

```
📋 任务列表
├── [Root] 需求: 实现用户登录系统
│   ├── [Planner] 任务规划
│   │   ├── [Developer] 前端登录页
│   │   ├── [Developer] 后端登录接口
│   │   └── [Tester] 登录测试
│   │
│   └── [Planner] 技术调研
│       └── [Developer] 调研第三方登录
│
├── [Root] 优化性能
│   └── [Planner] 性能分析
│       └── [Developer] 优化数据库查询
```

---

## 3. 功能列表

### 3.1 Agent 级别支持

- [ ] **Agent 类型枚举**：定义 `agentLevel` 枚举（root / planner / developer / tester）
- [ ] **Agent 级别字段**：在 `AgentRecord` 中添加 `level` 字段
- [ ] **任务 Agent 级别字段**：在 `TaskRecord` 中添加 `agentLevel` 字段
- [ ] **级别验证**：创建/分配任务时验证 Agent 级别权限

### 3.2 多级任务链路

- [ ] **任务链路追踪**：记录任务的创建者和执行者层级
- [ ] **Agent 父子关系**：支持 `parentAgentId` 关联（已有）
- [ ] **任务分配链**：任务 `creator` 字段记录任务创建者
- [ ] **层级深度计算**：计算任务在链路中的深度

### 3.3 任务树展示

- [ ] **树形视图组件**：基于现有任务列表开发树形展示模式
- [ ] **层级缩进**：不同层级任务使用不同缩进
- [ ] **层级标识**：显示任务对应的 Agent 级别图标/颜色
- [ ] **展开/折叠**：支持展开/折叠子任务
- [ ] **树形筛选**：按 Agent 级别筛选任务树

### 3.4 Agent 任务视图

- [ ] **Agent 级别筛选**：按级别（Root/Planner/Developer/Tester）筛选任务
- [ ] **Agent 任务统计**：各级别 Agent 的任务数量统计
- [ ] **下级任务查看**：查看某 Agent 分配的所有子任务

### 3.5 任务树 API

- [ ] **获取任务树**：`GET /api/tasks/tree` - 获取完整的任务树结构
- [ ] **获取子任务**：`GET /api/tasks/:taskId/subtasks` - 获取任务的直接子任务
- [ ] **获取任务路径**：`GET /api/tasks/:taskId/path` - 获取从根到当前任务的路径

---

## 4. 详细设计

### 4.1 数据模型扩展

#### 4.1.1 Agent 级别枚举

```typescript
// lib/types/task.ts 新增
export const agentLevels = ["root", "planner", "developer", "tester"] as const;
export type AgentLevel = typeof agentLevels[number];

// Agent 级别配置
export const agentLevelConfig: Record<AgentLevel, {
  label: string;
  color: string;
  icon: string;
  canCreateTask: boolean;
  canAssignToSubAgent: boolean;
  canExecuteTask: boolean;
  canVerifyTask: boolean;
}> = {
  root: {
    label: "Root",
    color: "var(--system-purple)",
    icon: "👑",
    canCreateTask: true,
    canAssignToSubAgent: true,
    canExecuteTask: false,
    canVerifyTask: false,
  },
  planner: {
    label: "Planner",
    color: "var(--system-blue)",
    icon: "📋",
    canCreateTask: true,
    canAssignToSubAgent: true,
    canExecuteTask: false,
    canVerifyTask: false,
  },
  developer: {
    label: "Developer",
    color: "var(--system-green)",
    icon: "💻",
    canCreateTask: false,
    canAssignToSubAgent: false,
    canExecuteTask: true,
    canVerifyTask: false,
  },
  tester: {
    label: "Tester",
    color: "var(--system-orange)",
    icon: "🧪",
    canCreateTask: false,
    canAssignToSubAgent: false,
    canExecuteTask: false,
    canVerifyTask: true,
  },
};
```

#### 4.1.2 AgentRecord 扩展

```typescript
export type AgentRecord = {
  agentId: string;
  parentAgentId?: string;
  name: string;
  // 新增: Agent 级别
  level: AgentLevel;
  status: AgentStatus;
  sessionId?: string;
  currentTaskId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
};
```

#### 4.1.3 TaskRecord 扩展

```typescript
export type TaskRecord = {
  taskId: string;
  title: string;
  status: TaskStatus;
  summary: string;
  resultSummary?: string;
  detailRef?: string;
  parentTaskId?: string;
  childTaskIds?: string[];
  dependencies?: TaskDependency[];
  dependsOnMe?: string[];
  
  // 现有字段
  assignedAgent?: string;
  claimedBy?: string;
  
  // 新增: 任务链路字段
  creator?: string;           // 任务创建者（Agent ID）
  creatorLevel?: AgentLevel; // 创建者级别
  depth?: number;            // 任务深度（0 = Root 任务）
  agentLevel?: AgentLevel;   // 执行者预期级别
  
  visibility: TaskVisibility;
  inputRefs: string[];
  outputRefs: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};
```

#### 4.1.4 任务树结构

```typescript
export type TaskTreeNode = {
  task: TaskRecord;
  children: TaskTreeNode[];
  agentLevel?: AgentLevel;
  depth: number;
};

export type TaskPath = {
  nodes: TaskRecord[];
  depth: number;
  rootTaskId: string;
};

export type TaskTreeResponse = {
  rootTasks: TaskTreeNode[];
  totalCount: number;
  levelCounts: Record<AgentLevel, number>;
};
```

### 4.2 API 设计

#### 4.2.1 获取任务树

```
GET /api/tasks/tree?depth=3&level=planner&agent=planner-001
```

**Query Parameters**:
| 参数 | 类型 | 描述 |
|------|------|------|
| depth | number | 最大深度，-1 表示不限制 |
| level | string | 按 Agent 级别筛选 |
| agent | string | 按 Agent 筛选 |
| status | string | 按状态筛选 |

**Response**:
```json
{
  "rootTasks": [
    {
      "task": {
        "taskId": "task_root_001",
        "title": "需求: 实现用户登录",
        "creator": "root",
        "depth": 0,
        "agentLevel": "root"
      },
      "children": [
        {
          "task": {
            "taskId": "task_001",
            "title": "任务规划",
            "creator": "root",
            "assignedAgent": "planner-001",
            "depth": 1,
            "agentLevel": "planner"
          },
          "children": [
            {
              "task": {
                "taskId": "task_001_1",
                "title": "前端登录页开发",
                "assignedAgent": "dev-001",
                "depth": 2,
                "agentLevel": "developer"
              },
              "children": []
            }
          ]
        }
      ],
      "depth": 0
    }
  ],
  "totalCount": 15,
  "levelCounts": {
    "root": 2,
    "planner": 3,
    "developer": 8,
    "tester": 2
  }
}
```

#### 4.2.2 获取任务路径

```
GET /api/tasks/:taskId/path
```

**Response**:
```json
{
  "nodes": [
    {
      "taskId": "task_root_001",
      "title": "需求: 实现用户登录",
      "depth": 0
    },
    {
      "taskId": "task_001",
      "title": "任务规划",
      "depth": 1
    },
    {
      "taskId": "task_001_1",
      "title": "前端登录页开发",
      "depth": 2
    }
  ],
  "depth": 2,
  "rootTaskId": "task_root_001"
}
```

#### 4.2.3 创建任务（支持链路）

```
POST /api/tasks
```

**Request**:
```json
{
  "title": "前端登录页开发",
  "summary": "实现用户登录页面",
  "parentTaskId": "task_001",
  "assignedAgent": "dev-001",
  "agentLevel": "developer",
  "visibility": "shared",
  "tags": ["frontend", "login"]
}
```

**Response**:
```json
{
  "taskId": "task_001_1",
  "depth": 2,
  "creator": "planner-001",
  "creatorLevel": "planner",
  "agentLevel": "developer"
}
```

### 4.3 前端组件设计

#### 4.3.1 任务树组件

```
┌─────────────────────────────────────────────────────────────────┐
│  任务树                                    [列表 ▾] [树形 ▾]    │
├─────────────────────────────────────────────────────────────────┤
│  筛选: [所有级别 ▼] [所有状态 ▼] [展开全部] [折叠全部]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👑 需求: 实现用户登录系统                    [Root]  2026-03-14│
│  │                                                           │
│  ├── 📋 任务规划                            [Planner]          │
│  │     │                                                         │
│  │     ├── 💻 前端登录页开发 (dev-001)     [Developer] 🟢      │
│  │     │                                                           │
│  │     ├── 💻 后端登录接口 (dev-002)       [Developer] 🔵      │
│  │     │                                                           │
│  │     └── 🧪 登录流程测试 (test-001)      [Tester] ⚪         │
│  │                                                           │
│  └── 📋 技术调研                              [Planner]          │
│        │                                                         │
│        └── 💻 第三方登录调研 (dev-003)      [Developer] ✅      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**组件结构**:
- `TaskTreeView.tsx` - 任务树主组件
- `TaskTreeNode.tsx` - 树节点组件（递归渲染）
- `TaskTreeFilter.tsx` - 树筛选栏
- `AgentLevelBadge.tsx` - Agent 级别徽章

#### 4.3.2 Agent 级别徽章

| 级别 | 颜色 | 图标 |
|------|------|------|
| Root | 紫色 | 👑 |
| Planner | 蓝色 | 📋 |
| Developer | 绿色 | 💻 |
| Tester | 橙色 | 🧪 |

#### 4.3.3 任务路径显示

在任务详情页显示从根到当前任务的路径：

```
← 返回
├── 需求: 实现用户登录系统 (Root)
│   └── 任务规划 (Planner)
│       └── 前端登录页开发 (Developer)
│
├────────────────────────────────────────
│  任务详情
```

---

## 5. 技术实现

### 5.1 后端改动

1. **类型定义更新** (`lib/types/task.ts`)
   - 添加 `AgentLevel` 枚举和配置
   - 扩展 `AgentRecord` 和 `TaskRecord`

2. **Store 层改动** (`lib/store/`)
   - 更新 `createTask` 方法，支持自动计算 `depth`
   - 添加 `getTaskTree` 方法
   - 添加 `getTaskPath` 方法

3. **API 路由** (`app/api/tasks/`)
   - 新增 `GET /api/tasks/tree` 路由
   - 更新 `POST /api/tasks` 支持 `agentLevel`
   - 新增 `GET /api/tasks/:taskId/path` 路由

### 5.2 前端改动

1. **组件新增** (`components/`)
   - `TaskTreeView.tsx` - 任务树视图
   - `TaskTreeNode.tsx` - 树节点
   - `AgentLevelBadge.tsx` - 级别徽章

2. **组件更新** (`components/task-list.tsx`)
   - 添加树形/列表视图切换
   - 添加任务层级缩进渲染
   - 添加 Agent 级别显示

3. **组件更新** (`components/agent-org-map.tsx`)
   - Agent 节点显示级别信息
   - 按级别着色

---

## 6. 实施计划

### Phase 1: 数据模型（1天）

- [ ] 添加 AgentLevel 枚举和配置
- [ ] 扩展 AgentRecord 类型
- [ ] 扩展 TaskRecord 类型
- [ ] 更新 Store 层支持新字段

### Phase 2: API 实现（1天）

- [ ] 新增任务树 API
- [ ] 新增任务路径 API
- [ ] 更新创建任务 API 支持 agentLevel
- [ ] 自动计算任务 depth

### Phase 3: 前端组件（2天）

- [ ] 开发 AgentLevelBadge 组件
- [ ] 开发 TaskTreeNode 组件
- [ ] 开发 TaskTreeView 组件
- [ ] 更新任务列表支持树形视图

### Phase 4: 集成测试（1天）

- [ ] 集成测试完整链路
- [ ] UI 优化和样式调整
- [ ] 响应式适配

**预计工期**: 5 天

---

## 7. 验收标准

### 7.1 Agent 级别

- [ ] 可创建带级别的 Agent 记录
- [ ] 任务可指定执行者级别
- [ ] 前端正确显示级别徽章

### 7.2 任务链路

- [ ] 创建子任务时自动计算 depth
- [ ] 正确记录 creator 和 creatorLevel
- [ ] 可获取任务的完整路径

### 7.3 任务树展示

- [ ] 树形视图正确渲染多级任务
- [ ] 展开/折叠功能正常
- [ ] 按级别筛选正确

### 7.4 权限控制

- [ ] Root 可创建所有级别任务
- [ ] Planner 可创建子任务
- [ ] Developer/Tester 只能执行任务

---

## 8. 风险与注意事项

1. **数据迁移**：现有任务需要批量更新添加 `depth` 字段
2. **循环检测**：需要检测任务父子关系循环
3. **深度限制**：建议限制最大深度防止无限递归
4. **性能考虑**：任务树可能较大，需要分页或延迟加载
