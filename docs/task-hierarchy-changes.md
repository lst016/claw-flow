# 任务层级改进 - 变更日志

> 日期: 2026-03-14
> 项目: claw-memory-plugin

## 已完成的功能

### 1. 任务支持父子层级关系 (parentTaskId)
- 后端已支持 `parentTaskId` 和 `childTaskIds` 字段
- API 层验证器已支持 `parentTaskId` 参数
- 创建任务时可指定父任务

### 2. 任务组织架构图 (TaskOrgMap)
- 新增 `components/task-org-map.tsx` 组件
- 使用 React Flow + Dagre 实现树形布局
- 显示任务状态、执行Agent、子任务数量等信息
- 支持节点点击查看详情
- 新增 Tab: "任务树"

### 3. 支持创建子任务
- 更新 `components/task-form.tsx`
- 添加"父任务"下拉选择框
- 显示现有任务列表供选择
- 过滤循环引用（不能选自己）

### 4. 任务详情显示父任务和子任务
- 更新 `components/task-detail.tsx`
- 添加"父任务"展示区域（可点击跳转）
- 子任务列表支持点击跳转
- 添加可点击样式 `.clickable`

### 5. 主页面集成
- 更新 `app/page.tsx`
- 新增"任务树" Tab
- 加载父任务信息到详情页
- 处理父子任务点击事件

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| components/task-form.tsx | 修改 | 添加父任务选择功能 |
| components/task-detail.tsx | 修改 | 添加父任务显示和交互 |
| components/task-org-map.tsx | 新增 | 任务层级树组件 |
| app/page.tsx | 修改 | 集成任务树Tab和交互逻辑 |
| app/globals.css | 修改 | 添加 .clickable 样式 |

## 后续可优化项

- Agent 级别区分（Root/Planner/Developer/Tester）
- 任务链路追踪和可视化
- 权限级别验证
- 按 Agent 级别筛选任务
