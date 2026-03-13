import type { ContextBundle, TaskEvent, TaskRecord, TaskStatus } from "@/lib/types/task";

const text = {
  title: "\u4efb\u52a1\u8be6\u60c5",
  description: "\u67e5\u770b\u8bb0\u5f55\u3001\u4e8b\u4ef6\u548c\u4e0a\u4e0b\u6587\u8fb9\u754c\u3002",
  idle: "\u7a7a\u95f2",
  selectFirst: "\u8bf7\u5148\u4ece\u67e5\u8be2\u8868\u4e2d\u9009\u62e9\u4e00\u6761\u4efb\u52a1\u8bb0\u5f55\u3002",
  loading: "\u6b63\u5728\u52a0\u8f7d\u9009\u4e2d\u7684\u8bb0\u5f55...",
  primary: "\u4e3b\u952e\u4fe1\u606f",
  visibility: "\u53ef\u89c1\u6027",
  owner: "\u9886\u53d6\u8005",
  unclaimed: "\u672a\u9886\u53d6",
  lease: "\u79df\u7ea6\u5230\u671f",
  none: "\u65e0",
  expiresAt: "\u8fc7\u671f\u65f6\u95f4",
  claim: "\u9886\u53d6\u4efb\u52a1",
  release: "\u91ca\u653e\u4efb\u52a1",
  taskTitle: "\u4efb\u52a1\u6807\u9898",
  taskStatus: "\u4efb\u52a1\u72b6\u6001",
  summary: "\u6458\u8981\u5feb\u7167",
  context: "\u4e0a\u4e0b\u6587\u6a21\u62df",
  actor: "\u6a21\u62df\u8bfb\u53d6\u7684 Agent",
  access: "\u8bbf\u95ee\u7ea7\u522b",
  mode: "\u5efa\u8bae\u6a21\u5f0f",
  contextSummary: "\u4e0a\u4e0b\u6587\u6458\u8981",
  suggestedRefs: "\u5efa\u8bae\u4f18\u5148\u8bfb\u53d6\u7684\u5f15\u7528",
  summaryOnly: "\u5f53\u524d actor \u53ea\u80fd\u8bfb\u53d6\u6458\u8981\u3002",
  ioRefs: "\u8f93\u5165 / \u8f93\u51fa\u5f15\u7528",
  inputRefs: "\u5141\u8bb8\u8bfb\u53d6\u7684\u8f93\u5165\u5f15\u7528",
  noInputRefs: "\u6682\u65e0\u8f93\u5165\u5f15\u7528",
  outputRefs: "\u5f53\u524d\u8f93\u51fa\u5f15\u7528",
  noOutputRefs: "\u6682\u65e0\u8f93\u51fa\u5f15\u7528",
  children: "\u5b50\u4efb\u52a1",
  noChildren: "\u5f53\u524d\u4efb\u52a1\u8fd8\u6ca1\u6709\u5b50\u4efb\u52a1\u3002",
  recentEvents: "\u6700\u8fd1\u4e8b\u4ef6",
  noEvents: "\u6682\u65e0\u4e8b\u4ef6\u8bb0\u5f55",
  readableArtifacts: "\u53ef\u8bfb\u53d6\u7684 Artifact",
  unknownSource: "\u672a\u77e5\u6765\u6e90",
  noReadableArtifacts: "\u5f53\u524d actor \u6ca1\u6709\u62ff\u5230\u8be6\u7ec6 Artifact\uff0c\u53ea\u80fd\u4f9d\u8d56\u6458\u8981\u7ee7\u7eed\u5de5\u4f5c\u3002",
  payload: "\u8be6\u7ec6\u5185\u5bb9\u8f7d\u8377",
  payloadPlaceholder: "\u5b8c\u6574\u6267\u884c\u7ec6\u8282\u3001\u65e5\u5fd7\u3001\u4ee3\u7801\u6539\u52a8\u6458\u8981\u6216\u5206\u6790\u5185\u5bb9\u3002",
  saving: "\u63d0\u4ea4\u4e2d...",
  save: "\u4fdd\u5b58\u8bb0\u5f55",
  noSummary: "\u6682\u65e0\u6458\u8981\u3002",
  unassigned: "\u672a\u5206\u914d",
  full: "\u5b8c\u6574\u8bbf\u95ee",
  summaryOnlyLabel: "\u4ec5\u6458\u8981",
  private: "\u79c1\u6709",
  parent: "\u7236\u4efb\u52a1\u53ef\u89c1",
  shared: "\u5171\u4eab",
} as const;

const statusLabels: Record<TaskStatus, string> = {
  pending: "\u5f85\u5904\u7406",
  running: "\u6267\u884c\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  failed: "\u5931\u8d25",
};

const visibilityLabels = {
  private: text.private,
  parent: text.parent,
  shared: text.shared,
} as const;

const accessLabels = {
  full: text.full,
  summary_only: text.summaryOnlyLabel,
} as const;

type TaskDetailProps = {
  task: TaskRecord | null;
  childTasks: TaskRecord[];
  artifact: string;
  artifactLoading: boolean;
  saving: boolean;
  statusDraft: TaskStatus;
  summaryDraft: string;
  events: TaskEvent[];
  contextBundle: ContextBundle | null;
  simulatedActor: string;
  onSimulatedActorChange: (value: string) => void;
  onClaim: () => void;
  onRelease: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onSummaryChange: (summary: string) => void;
  onArtifactChange: (artifact: string) => void;
  onSave: () => void;
};

export function TaskDetail({
  task,
  childTasks,
  artifact,
  artifactLoading,
  saving,
  statusDraft,
  summaryDraft,
  events,
  contextBundle,
  simulatedActor,
  onSimulatedActorChange,
  onClaim,
  onRelease,
  onStatusChange,
  onSummaryChange,
  onArtifactChange,
  onSave,
}: TaskDetailProps) {
  const readableArtifacts = [...(contextBundle?.inputArtifacts ?? []), ...(contextBundle?.outputArtifacts ?? [])];

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          {task ? <span className={`pill ${task.status}`}>{statusLabels[task.status]}</span> : <span className="pill">{text.idle}</span>}
        </div>

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
                <span>{task.leaseExpiresAt ? new Date(task.leaseExpiresAt).toLocaleString() : text.none}</span>
                <span>{text.expiresAt}</span>
                <span>{new Date(task.expiresAt).toLocaleString()}</span>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="button secondary" type="button" onClick={onClaim} disabled={saving}>
                  {text.claim}
                </button>
                <button className="button secondary" type="button" onClick={onRelease} disabled={saving}>
                  {text.release}
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
              <p className="section-label">{text.context}</p>
              <div className="row">
                <label>{text.actor}</label>
                <input
                  className="field"
                  value={simulatedActor}
                  onChange={(event) => onSimulatedActorChange(event.target.value)}
                  placeholder="backend-agent"
                />
              </div>
              <div className="kv-grid">
                <span>{text.access}</span>
                <span>{contextBundle ? accessLabels[contextBundle.guidance.access] : text.none}</span>
                <span>{text.mode}</span>
                <span>{contextBundle?.guidance.mode ?? "summary_first"}</span>
                <span>{text.contextSummary}</span>
                <span>{contextBundle?.guidance.summary || text.noSummary}</span>
              </div>
              <div className="context-block">
                <strong>{text.suggestedRefs}</strong>
                <div className="ref-list">
                  {(contextBundle?.guidance.suggestedRefs ?? []).map((ref) => (
                    <span key={ref} className="ref-chip">
                      {ref}
                    </span>
                  ))}
                  {(contextBundle?.guidance.suggestedRefs.length ?? 0) === 0 ? <span className="cell-muted">{text.summaryOnly}</span> : null}
                </div>
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

            <div className="detail-card">
              <p className="section-label">{text.children}</p>
              <div className="event-list">
                {childTasks.map((childTask) => (
                  <div key={childTask.taskId} className="event-item">
                    <div className="meta">
                      <span className={`pill ${childTask.status}`}>{statusLabels[childTask.status]}</span>
                      <span>{childTask.assignedAgent || text.unassigned}</span>
                    </div>
                    <strong>{childTask.title}</strong>
                    <span className="cell-muted mono">{childTask.taskId}</span>
                  </div>
                ))}
                {childTasks.length === 0 ? <div className="cell-muted">{text.noChildren}</div> : null}
              </div>
            </div>

            <div className="detail-card">
              <p className="section-label">{text.recentEvents}</p>
              <div className="event-list">
                {events.slice(0, 8).map((event) => (
                  <div key={event.eventId} className="event-item">
                    <div className="meta">
                      <span className="pill">{event.type}</span>
                      <span>{event.actor || "system"}</span>
                    </div>
                    <strong>{event.message}</strong>
                    <span className="cell-muted">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {events.length === 0 ? <div className="cell-muted">{text.noEvents}</div> : null}
              </div>
            </div>

            <div className="detail-card">
              <p className="section-label">{text.readableArtifacts}</p>
              <div className="event-list">
                {readableArtifacts.map((artifactItem) => (
                  <div key={artifactItem.artifactId} className="event-item">
                    <div className="meta">
                      <span className="pill">{artifactItem.type}</span>
                      <span>{artifactItem.sourceAgent || text.unknownSource}</span>
                    </div>
                    <strong>{artifactItem.summary || artifactItem.artifactId}</strong>
                    <span className="cell-muted mono">{artifactItem.artifactId}</span>
                  </div>
                ))}
                {readableArtifacts.length === 0 ? <div className="cell-muted">{text.noReadableArtifacts}</div> : null}
              </div>
            </div>

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
