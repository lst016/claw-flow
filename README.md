# Claw 记忆插件

这是一个基于 Next.js 的任务记忆插件，用来把 Root / Claw / subagent 的任务卡、事件流和详细执行内容外置出来，避免 subagent 直接互相污染上下文。

## 当前定位

- Root 继续负责理解需求和分发任务
- subagent 不直接共享整段上下文
- 任务之间通过 `taskId`、引用列表和上下文包交换信息
- 默认所有缓存数据保留 7 天

## 现在支持的核心能力

- 任务卡：标题、状态、摘要、可见性、输入引用、输出引用、标签
- Artifact：详细日志、分析、代码说明、执行结果
- Task Events：任务创建、更新、完成、失败、写入 artifact、读取上下文、领取与释放
- Claim / Lease：任务领取、租约到期、释放租约
- Context Bundle：按 actor 和任务边界生成可读取上下文
- Redis 模式和内存模式

## 上下文访问规则

`GET /api/tasks/:taskId/context?actor=xxx` 会根据 actor 返回两种访问级别：

- `full`
  root、任务的 `assignedAgent`、当前 `claimedBy`，以及满足共享规则的 actor 可以拿到完整 Artifact 引用。
- `summary_only`
  不满足访问条件的 actor 只能拿到任务摘要、任务元信息和事件流，拿不到详细 Artifact。

目前的授权规则如下：

1. `root` 永远是完整访问。
2. `visibility=shared` 时，任何 actor 都是完整访问。
3. 任务的 `assignedAgent` 或 `claimedBy` 是完整访问。
4. `visibility=parent` 时，父任务的负责 actor 也能完整访问。
5. 其他情况默认只有摘要权限。

## 默认保留时间

默认所有缓存数据保留 7 天：

- 任务
- Artifact
- Task Events

可以通过环境变量修改：

```bash
CACHE_TTL_DAYS=7
```

## 启动

```bash
npm install
npm run dev
```

打开 [http://localhost:3333](http://localhost:3333)

## 环境变量

```bash
REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_DAYS=7
```

如果不提供 `REDIS_URL`，项目会自动回退到内存模式。

## API

### `GET /api/tasks`

获取任务列表。

### `POST /api/tasks`

创建任务。

```json
{
  "title": "实现登录接口",
  "summary": "Root 只保留这个短摘要。",
  "assignedAgent": "backend-agent",
  "visibility": "private",
  "inputRefs": ["artifact_xxx"],
  "tags": ["auth", "backend"]
}
```

### `GET /api/tasks/:taskId`

读取单个任务和它最新关联的详细内容。

### `PATCH /api/tasks/:taskId`

更新任务。

```json
{
  "status": "running",
  "summary": "开始实现控制器。",
  "inputRefs": ["artifact_prev_001"],
  "outputRefs": ["artifact_new_001"],
  "visibility": "parent"
}
```

### `POST /api/tasks/:taskId/artifact`

保存详细内容。

```json
{
  "content": "完整执行日志或分析结果。",
  "type": "analysis",
  "summary": "登录流程分析完成",
  "sourceAgent": "backend-agent",
  "tags": ["auth", "analysis"]
}
```

### `GET /api/tasks/:taskId/events`

读取该任务的事件流。

### `POST /api/tasks/:taskId/events`

手动追加任务事件。

```json
{
  "type": "task_updated",
  "actor": "root",
  "message": "重新分配给 backend-agent"
}
```

### `GET /api/tasks/:taskId/context?actor=backend-agent`

读取该任务的上下文包。

接口会返回：

- 当前任务卡
- 当前 actor 可读取的输入 Artifact
- 当前 actor 可读取的输出 Artifact
- 最近事件
- 建议优先读取的引用
- 当前访问级别：`full` 或 `summary_only`

这个接口的重点不是把所有内容都塞给 agent，而是只把它应该看到的上下文打包出来。

### `POST /api/tasks/:taskId/claim`

领取任务并创建租约。

```json
{
  "actor": "backend-agent",
  "leaseSeconds": 1800
}
```

### `DELETE /api/tasks/:taskId/claim?actor=backend-agent`

释放任务租约。

## 推荐工作流

1. Root 调用 `POST /api/tasks` 创建任务。
2. Root 只把 `taskId`、摘要和少量输入引用交给 subagent。
3. subagent 需要上下文时，调用 `GET /api/tasks/:taskId/context?actor=xxx`。
4. subagent 执行后调用 `PATCH /api/tasks/:taskId` 更新状态。
5. subagent 调用 `POST /api/tasks/:taskId/artifact` 保存详细内容。
6. 关键动作自动写入 Task Events，便于恢复流程和审计上下文。

这样做的核心价值是：

- subagent 不直接互相传大段上下文
- 它们只通过 `taskId`、`inputRefs`、`outputRefs` 交换内容
- Root 可以通过摘要和事件流恢复任务状态
- 不同 actor 拿到的上下文深度可以被明确限制
