# 记忆插件整合规划 - 名字与功能演进

> **项目**: claw-memory-plugin  
> **版本**: v4.0 (规划中)  
> **日期**: 2026-03-14  
> **状态**: 规划完成

---

## 1. 新名字建议

### 1.1 候选名字

| 名字 | 含义 | 优势 | 适用场景 |
|------|------|------|----------|
| **ClawFlow** | Claw + Flow（工作流） | 体现任务流动、Agent 协作、上下文传递 | 任务管理 + Agent 协作 |
| **ClawHub** | Claw 中心枢纽 | 体现多 Agent 汇聚点、上下文交换中心 | 多 Agent 系统中枢 |
| **TaskNest** | 任务巢穴 | 强调任务聚合、记忆存储、上下文嵌套 | 记忆 + 任务管理 |

### 1.2 推荐：**ClawFlow**

**理由**：
1. 体现核心价值：**上下文流动**（Task → Artifact → Context → Next Task）
2. 与 ClawPort 品牌呼应（Claw 开头）
3. 简洁好记，无生僻词
4. 可扩展：未来可加入工作流引擎（Workflow Engine）

---

## 2. 功能整合规划

### 2.1 可整合功能评估

| ClawPort 功能 | 整合优先级 | 整合方式 | 理由 |
|---------------|-----------|----------|------|
| **Agent 组织架构图** | ⭐⭐⭐ 高 | 新增模块 | 记忆插件已有 Agent 上下文概念，可扩展为组织图可视化 |
| **实时日志流** | ⭐⭐⭐ 高 | 增强现有 Events | 现有 Task Events 可扩展为实时日志流，支持 SSE/WebSocket |
| **任务 Kanban** | ⭐⭐ 中 | 增强现有任务列表 | 现有任务管理可扩展为看板视图 |
| **成本追踪** | ⭐ 低 | 暂不整合 | 需要对接 Token 统计，超出当前范围 |

### 2.2 整合详情

#### 2.2.1 Agent 组织架构图 (Org Map)

**目标**：可视化展示 Agent 层级和任务分布

**整合方式**：
- 复用 ClawPort 的 React Flow 实现
- 从现有记忆插件读取 Agent 任务分布数据
- 在任务卡中增加 `agentId` 字段，关联到组织架构

**新增 API**：
```
GET /api/agents              # 获取所有 Agent 列表
GET /api/agents/:agentId    # 获取 Agent 详情 + 任务统计
GET /api/org-tree           # 获取组织树结构
```

**数据模型扩展**：
```typescript
interface Agent {
  id: string;
  name: string;
  role: string;
  parentId?: string;        // 上级 Agent
  status: 'active' | 'idle';
  taskCount: number;
  createdAt: Date;
}
```

#### 2.2.2 实时日志流 (Live Logs)

**目标**：实时推送任务事件，无需手动刷新

**整合方式**：
- 在现有 Task Events 基础上增加 SSE（Server-Sent Events）支持
- 复用 ClawPort 的 Activity Console UI

**新增 API**：
```
GET /api/events/stream?taskId=xxx   # SSE 实时推送任务事件
```

**实现要点**：
- 任务创建/更新/完成时自动生成事件（无需手动调用）
- 支持按 Agent 筛选日志
- 支持日志级别（info/warn/error）
- 前端使用 EventSource 接收实时推送

#### 2.2.3 任务 Kanban

**目标**：看板视图管理任务

**整合方式**：
- 复用 ClawPort 的 Kanban UI（drag-and-drop）
- 映射到现有任务状态：pending → backlog, running → in-progress, completed → done, failed → blocked

**新增功能**：
- 看板列：Backlog | In Progress | Review | Done | Blocked
- 拖拽更新状态
- 卡片展示：任务标题、Agent 头像、优先级标签

---

## 3. 架构演进

### 3.1 模块划分

```
ClawFlow (新名字)
├── Task Module (任务管理)
│   ├── 任务 CRUD
│   ├── 任务筛选/搜索
│   ├── 看板视图 ⭐ 新增
│   └── 批量操作
├── Context Module (上下文管理)
│   ├── Artifact 存储
│   ├── Context Bundle
│   └── 访问控制
├── Events Module (事件系统)
│   ├── Task Events
│   ├── SSE 实时推送 ⭐ 新增
│   └── 日志聚合
├── Org Module (组织架构) ⭐ 新增
│   ├── Agent 注册
│   ├── 组织树
│   └── 任务分布统计
└── Stats Module (统计分析)
    ├── 完成率统计
    └── 耗时分析
```

### 3.2 技术栈扩展

| 模块 | 技术选型 | 说明 |
|------|----------|------|
| 实时日志 | SSE | 轻量级，无需 WebSocket 复杂握手 |
| 组织图 | React Flow | 复用 ClawPort 组件 |
| 看板 | @dnd-kit | React 拖拽库 |
| 图表 | Recharts | 统计图表 |

---

## 4. 实施路线图

### Phase 1: 基础设施（1周）

- [ ] 重命名项目为 ClawFlow
- [ ] 实现 SSE 实时事件推送
- [ ] 任务自动事件生成

### Phase 2: 可视化（1周）

- [ ] 实现任务 Kanban 看板
- [ ] 实现 Agent 组织架构图
- [ ] 实现基础统计图表

### Phase 3: 增强（1周）

- [ ] 批量操作功能
- [ ] 高级筛选
- [ ] 任务依赖关系

---

## 5. 风险与决策

### 5.1 命名风险

- **ClawFlow** 可能与现有工具重名 → 备选 **ClawHub**
- 建议先内部使用，后续根据品牌情况正式命名

### 5.2 功能边界

- 成本追踪需要 Token 统计，暂时不整合
- Chat 功能不整合，保持记忆插件职责单一

### 5.3 技术债务

- 复用 ClawPort 组件需要处理样式隔离
- SSE 与现有 API 兼容性问题需测试

---

## 6. 下一步

1. **确认名字**：确认使用 **ClawFlow** 作为新名字
2. **技术评审**：评审 SSE、组织图技术方案
3. **开发迭代**：按 Phase 1-3 顺序开发

---

**文档状态**：✅ 规划完成，等待确认
