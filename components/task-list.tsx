import type { TaskRecord, TaskStatus } from "@/lib/types/task";

const text = {
  title: "\u4efb\u52a1\u67e5\u8be2",
  description: "\u6309\u6807\u9898\u3001\u72b6\u6001\u548c Agent \u67e5\u8be2\u4efb\u52a1\u3002",
  rows: "\u6761",
  search: "\u6309\u6807\u9898\u3001\u4efb\u52a1 ID\u3001Agent \u641c\u7d22...",
  allStatus: "\u5168\u90e8\u72b6\u6001",
  task: "\u4efb\u52a1",
  status: "\u72b6\u6001",
  agent: "Agent",
  updatedAt: "\u66f4\u65b0\u65f6\u95f4",
  recordId: "\u8bb0\u5f55 ID",
  empty: "\u6ca1\u6709\u5339\u914d\u7684\u8bb0\u5f55\uff0c\u53ef\u4ee5\u5148\u65b0\u5efa\u4efb\u52a1\u6216\u8c03\u6574\u7b5b\u9009\u6761\u4ef6\u3002",
  loading: "\u6b63\u5728\u52a0\u8f7d\u4efb\u52a1\u8bb0\u5f55...",
  unassigned: "\u672a\u5206\u914d",
  noSummary: "\u6682\u65e0\u6458\u8981\u3002",
} as const;

const statusLabels: Record<TaskStatus, string> = {
  pending: "\u5f85\u5904\u7406",
  running: "\u6267\u884c\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  failed: "\u5931\u8d25",
};

type TaskListProps = {
  tasks: TaskRecord[];
  loading: boolean;
  selectedTaskId?: string;
  search: string;
  statusFilter: TaskStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatus | "all") => void;
  onSelect: (taskId: string) => void;
};

export function TaskList({
  tasks,
  loading,
  selectedTaskId,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
}: TaskListProps) {
  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="pill">
            {tasks.length} {text.rows}
          </span>
        </div>

        <div className="toolbar">
          <input className="field" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={text.search} />
          <select className="select" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as TaskStatus | "all")}>
            <option value="all">{text.allStatus}</option>
            <option value="pending">{statusLabels.pending}</option>
            <option value="running">{statusLabels.running}</option>
            <option value="completed">{statusLabels.completed}</option>
            <option value="failed">{statusLabels.failed}</option>
          </select>
        </div>

        {loading ? (
          <div className="empty">{text.loading}</div>
        ) : tasks.length === 0 ? (
          <div className="empty">{text.empty}</div>
        ) : (
          <div className="table-shell">
            <div className="table-header">
              <span>{text.task}</span>
              <span>{text.status}</span>
              <span>{text.agent}</span>
              <span>{text.updatedAt}</span>
              <span>{text.recordId}</span>
            </div>

            {tasks.map((task) => (
              <button
                key={task.taskId}
                className={`table-row ${selectedTaskId === task.taskId ? "active" : ""}`}
                type="button"
                onClick={() => onSelect(task.taskId)}
              >
                <span className="task-title">
                  <strong>{task.title}</strong>
                  <span>{task.summary || text.noSummary}</span>
                </span>
                <span className={`pill ${task.status}`}>{statusLabels[task.status]}</span>
                <span className="cell-muted">{task.assignedAgent || text.unassigned}</span>
                <span className="cell-muted">{new Date(task.updatedAt).toLocaleString()}</span>
                <span className="mono">{task.taskId}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
