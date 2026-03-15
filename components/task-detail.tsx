import type { TaskEvent, TaskRecord, TaskStatus } from "@/lib/types/task";
import { formatDateTime } from "@/lib/utils/date";
import { TaskTimeline } from "./task-timeline";

const text = {
  title: "任务详情",
  description: "查看记录、事件和上下文边界。",
  idle: "空闲",
  selectFirst: "请先从查询表中选择一条任务记录。",
  loading: "正在加载选中的记录...",
  primary: "主键信息",
  visibility: "可见性",
  owner: "领取者",
  unclaimed: "未领取",
  lease: "租约到期",
  none: "无",
  expiresAt: "过期时间",
  claim: "领取任务",
  deleteTask: "彻底删除",
  taskTitle: "任务标题",
  taskStatus: "任务状态",
  summary: "摘要快照",
  context: "上下文模拟",
  actor: "模拟读取的 Agent",
  access: "访问级别",
  mode: "建议模式",
  contextSummary: "上下文摘要",
  suggestedRefs: "建议优先读取的引用",
  summaryOnly: "当前 actor 只能读取摘要。",
  ioRefs: "输入 / 输出引用",
  inputRefs: "允许读取的输入引用",
  noInputRefs: "暂无输入引用",
  outputRefs: "当前输出引用",
  noOutputRefs: "暂无输出引用",
  parentTask: "父任务",
  noParentTask: "当前任务是根任务。",
  children: "子任务",
  noChildren: "当前任务还没有子任务。",
  recentEvents: "最近事件",
  noEvents: "暂无事件记录",
  readableArtifacts: "可读取的 Artifact",
  unknownSource: "未知来源",
  noReadableArtifacts: "当前 actor 没有拿到详细 Artifact，只能依靠摘要继续工作。",
  payload: "详细内容载荷",
  payloadPlaceholder: "完整执行细节、日志、代码改动摘要或分析内容。",
  saving: "提交中...",
  save: "保存记录",
  noSummary: "暂无摘要。",
  unassigned: "未分配",
  full: "完整访问",
  summaryOnlyLabel: "仅摘要",
  private: "私有",
  parent: "父任务可见",
  shared: "共享",
} as const;

const statusLabels: Record<TaskStatus, string> = {
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

const visibilityLabels = {
  private: text.private,
  parent: text.parent,
  shared: text.shared,
} as const;

type TaskDetailProps = {
  task: TaskRecord | null;
  parentTask: TaskRecord | null;
  childTasks: TaskRecord[];
  artifact: string;
  artifactLoading: boolean;
  saving: boolean;
  statusDraft: TaskStatus;
  summaryDraft: string;
  events: TaskEvent[];
  onSelectParentTask: (taskId: string) => void;
  onSelectChildTask: (taskId: string) => void;
  onClaim: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onSummaryChange: (summary: string) => void;
  onArtifactChange: (artifact: string) => void;
  onSave: () => void;
  /** 是否隐藏 header（用于抽屉模式） */
  hideHeader?: boolean;
};

export function TaskDetail({
  task,
  parentTask,
  childTasks,
  artifact,
  artifactLoading,
  saving,
  statusDraft,
  summaryDraft,
  events,
  onSelectParentTask,
  onSelectChildTask,
  onClaim,
  onDelete,
  onStatusChange,
  onSummaryChange,
  onArtifactChange,
  onSave,
  hideHeader = false,
}: TaskDetailProps) {

  return (
    <article className="panel">
      <div className="panel-inner">
        {!hideHeader && (
          <div className="panel-header">
            <div>
              <h2>{text.title}</h2>
              <p>{text.description}</p>
            </div>
            {task ? <span className={`pill ${task.status}`}>{statusLabels[task.status]}</span> : <span className="pill">{text.idle}</span>}
          </div>
        )}

        {!task ? (
          <div className="empty">{text.selectFirst}</div>
        ) : artifactLoading ? (
          <div className="empty">{text.loading}</div>
        ) : (
          <div className="detail-grid">
            <div className="detail-card">
              <p className="section-label">{text.primary}</p>
              <strong className="mono">{task.taskId}</strong>
              <div className="kv-grid">
                <span>Agent</span>
                <span>{task.assignedAgent || text.unassigned}</span>
                <span>{text.visibility}</span>
                <span>{visibilityLabels[task.visibility]}</span>
                <span>{text.owner}</span>
                <span>{task.claimedBy || text.unclaimed}</span>
                <span>{text.lease}</span>
                <span>{task.leaseExpiresAt ? formatDateTime(task.leaseExpiresAt) : text.none}</span>
                <span>{text.expiresAt}</span>
                <span>{formatDateTime(task.expiresAt)}</span>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="button secondary" type="button" onClick={onClaim} disabled={saving}>
                  {text.claim}
                </button>
                <button className="button danger" type="button" onClick={onDelete} disabled={saving}>
                  {text.deleteTask}
                </button>
              </div>
            </div>

            <div className="detail-card">
              <div className="row">
                <label>{text.taskTitle}</label>
                <input className="field" value={task.title} readOnly />
              </div>

              <div className="row">
                <label>{text.taskStatus}</label>
                <select className="select" value={statusDraft} onChange={(event) => onStatusChange(event.target.value as TaskStatus)}>
                  <option value="pending">{statusLabels.pending}</option>
                  <option value="running">{statusLabels.running}</option>
                  <option value="completed">{statusLabels.completed}</option>
                  <option value="failed">{statusLabels.failed}</option>
                </select>
              </div>

              <div className="row">
                <label>{text.summary}</label>
                <textarea className="textarea" value={summaryDraft} onChange={(event) => onSummaryChange(event.target.value)} />
              </div>
            </div>

            <div className="detail-card">
              <p className="section-label">{text.ioRefs}</p>
              <div className="context-block">
                <strong>{text.inputRefs}</strong>
                <div className="ref-list">
                  {(task.inputRefs ?? []).map((ref) => (
                    <span key={ref} className="ref-chip">
                      {ref}
                    </span>
                  ))}
                  {task.inputRefs.length === 0 ? <span className="cell-muted">{text.noInputRefs}</span> : null}
                </div>
              </div>
              <div className="context-block">
                <strong>{text.outputRefs}</strong>
                <div className="ref-list">
                  {task.outputRefs.map((ref) => (
                    <span key={ref} className="ref-chip">
                      {ref}
                    </span>
                  ))}
                  {task.outputRefs.length === 0 ? <span className="cell-muted">{text.noOutputRefs}</span> : null}
                </div>
              </div>
            </div>

            {/* 任务树 - 简化版 */}
            <div className="detail-card">
              <p className="section-label">任务关系</p>
              <div className="task-tree-simple">
                {/* 父任务 */}
                {parentTask && (
                  <div className="tree-item parent" onClick={() => onSelectParentTask(parentTask.taskId)}>
                    <span className="tree-arrow">↑</span>
                    <span className={`tree-status ${parentTask.status}`}>●</span>
                    <span className="tree-title">{parentTask.title}</span>
                    <span className="tree-agent">{parentTask.assignedAgent || '-'}</span>
                    {parentTask.subagent && <span className="tree-subagent">{parentTask.subagent}</span>}
                  </div>
                )}
                
                {/* 当前任务 */}
                <div className="tree-item current">
                  <span className={`tree-status ${task.status}`}>●</span>
                  <span className="tree-title">{task.title}</span>
                  <span className="tree-agent">{task.assignedAgent || '-'}</span>
                  {task.subagent && <span className="tree-subagent">{task.subagent}</span>}
                </div>

                {/* 子任务 */}
                {childTasks.map((childTask) => (
                  <div className="tree-item child" key={childTask.taskId} onClick={() => onSelectChildTask(childTask.taskId)}>
                    <span className="tree-arrow">↓</span>
                    <span className={`tree-status ${childTask.status}`}>●</span>
                    <span className="tree-title">{childTask.title}</span>
                    <span className="tree-agent">{childTask.assignedAgent || '-'}</span>
                    {childTask.subagent && <span className="tree-subagent">{childTask.subagent}</span>}
                  </div>
                ))}
                
                {(!parentTask && childTasks.length === 0) && (
                  <div className="cell-muted">无父子任务关系</div>
                )}
              </div>
            </div>

            {/* 任务流时间轴 */}
            <TaskTimeline events={events} />

            <div className="detail-card">
              <p className="section-label">{text.payload}</p>
              <textarea
                className="textarea"
                value={artifact}
                onChange={(event) => onArtifactChange(event.target.value)}
                placeholder={text.payloadPlaceholder}
              />
            </div>

            <div className="actions">
              <button className="button" type="button" onClick={onSave} disabled={saving}>
                {saving ? text.saving : text.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
