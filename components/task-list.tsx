import { useState, useEffect, useCallback } from "react";
import type { TaskRecord, TaskStatus, TaskListResponse } from "@/lib/types/task";
import { formatDateTime } from "@/lib/utils/date";

const text = {
  title: "任务列表",
  description: "按标题、状态和 Agent 查询任务。",
  rows: "条",
  search: "按标题、任务 ID、Agent 搜索...",
  allStatus: "全部状态",
  task: "任务",
  status: "状态",
  agent: "Agent",
  updatedAt: "更新时间",
  recordId: "记录 ID",
  empty: "没有匹配的任务记录，可以先新建任务或调整筛选条件。",
  loading: "正在加载任务记录...",
  unassigned: "未分配",
  noSummary: "暂无摘要。",
  selectAll: "全选",
  deselectAll: "取消全选",
  selected: "已选择",
  items: "项",
  batchUpdate: "批量更新",
  batchDelete: "批量删除",
  batchAssign: "批量分配",
  confirmDelete: "确认删除选中的",
  confirmDeleteSuffix: "个任务吗？此操作不可恢复。",
  cancel: "取消",
  delete: "删除",
  updateStatus: "更新状态",
  assignTo: "分配给",
  // Filters
  filterByStatus: "按状态筛选",
  filterByAgent: "按 Agent 筛选",
  filterByTags: "按标签筛选",
  filterByParent: "筛选子任务",
  from: "开始日期",
  to: "结束日期",
  apply: "应用筛选",
  reset: "重置",
  // Pagination
  totalRecords: "共",
  records: "条记录",
  page: "当前页",
} as const;

const statusLabels: Record<TaskStatus, string> = {
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

type TaskListProps = {
  tasks: TaskRecord[];
  loading: boolean;
  selectedTaskId?: string;
  onSelect: (taskId: string) => void;
  onTasksRefresh: () => void;
};

type FilterState = {
  search: string;
  status: TaskStatus | "all";
  agent: string;
  tags: string;
  from: string;
  to: string;
  parentTaskId: string;
};

export function TaskList({
  tasks,
  loading,
  selectedTaskId,
  onSelect,
  onTasksRefresh,
}: TaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    agent: "",
    tags: "",
    from: "",
    to: "",
    parentTaskId: "",
  });
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<TaskStatus>("completed");
  const [batchAgent, setBatchAgent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [allAgents, setAllAgents] = useState<string[]>([]);

  // Fetch unique agents for filter dropdown
  useEffect(() => {
    const agents = new Set<string>();
    tasks.forEach(task => {
      if (task.assignedAgent) agents.add(task.assignedAgent);
      if (task.claimedBy) agents.add(task.claimedBy);
    });
    setAllAgents(Array.from(agents).sort());
  }, [tasks]);

  const handleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.taskId)));
    }
  };

  const handleToggleSelect = (taskId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0) return;

    const taskIds = Array.from(selectedIds);
    let action: string = "";
    let payload: any = {};

    if (batchAction === "update_status") {
      action = "update_status";
      payload = { status: batchStatus };
    } else if (batchAction === "assign_agent") {
      action = "assign_agent";
      payload = { agent: batchAgent };
    }

    try {
      const response = await fetch("/api/tasks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, action, payload }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        setBatchAction(null);
        onTasksRefresh();
      }
    } catch (error) {
      console.error("Batch update failed:", error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const taskIds = Array.from(selectedIds);

    try {
      const response = await fetch("/api/tasks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, action: "delete" }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        setConfirmDelete(false);
        onTasksRefresh();
      }
    } catch (error) {
      console.error("Batch delete failed:", error);
    }
  };

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.agent) params.set("agent", filters.agent);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.tags) params.set("tags", filters.tags);
    if (filters.parentTaskId) params.set("parentTaskId", filters.parentTaskId);
    params.set("limit", "100");
    return params.toString();
  };

  const handleApplyFilters = async () => {
    const params = buildFilterParams();
    try {
      const response = await fetch(`/api/tasks?${params}`, { cache: "no-store" });
      const data = (await response.json()) as TaskListResponse;
      // Update tasks through parent - for now just refresh
      onTasksRefresh();
    } catch (error) {
      console.error("Filter failed:", error);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      agent: "",
      tags: "",
      from: "",
      to: "",
      parentTaskId: "",
    });
    onTasksRefresh();
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onTasksRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [onTasksRefresh]);

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
          <input 
            className="field" 
            value={filters.search} 
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={text.search}
          />
          <select 
            className="select" 
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus | "all" })}
          >
            <option value="all">{text.allStatus}</option>
            <option value="pending">{statusLabels.pending}</option>
            <option value="running">{statusLabels.running}</option>
            <option value="completed">{statusLabels.completed}</option>
            <option value="failed">{statusLabels.failed}</option>
          </select>
          <button 
            className="button secondary" 
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "收起筛选" : "更多筛选"}
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel" style={{ marginBottom: "1rem", padding: "1rem", background: "var(--panel-soft)", borderRadius: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              <select 
                className="select"
                value={filters.agent}
                onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
              >
                <option value="">{text.filterByAgent}</option>
                {allAgents.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
              <input 
                type="date" 
                className="field"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                placeholder={text.from}
              />
              <input 
                type="date" 
                className="field"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                placeholder={text.to}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="button primary" onClick={handleApplyFilters}>
                {text.apply}
              </button>
              <button className="button secondary" onClick={handleResetFilters}>
                {text.reset}
              </button>
            </div>
          </div>
        )}

        {/* Batch Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="batch-actions" style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem", 
            padding: "0.75rem", 
            background: "var(--accent-soft)",
            borderRadius: "8px",
            marginBottom: "1rem"
          }}>
            <span>{text.selected} {selectedIds.size} {text.items}</span>
            <button className="button secondary" onClick={() => setSelectedIds(new Set())}>
              {text.deselectAll}
            </button>
            <select 
              className="select" 
              value={batchAction || ""}
              onChange={(e) => setBatchAction(e.target.value || null)}
              style={{ width: "auto" }}
            >
              <option value="">{text.batchUpdate}</option>
              <option value="update_status">{text.updateStatus}</option>
              <option value="assign_agent">{text.assignTo}</option>
              <option value="delete">{text.batchDelete}</option>
            </select>
            
            {batchAction === "update_status" && (
              <select 
                className="select" 
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as TaskStatus)}
                style={{ width: "auto" }}
              >
                <option value="pending">{statusLabels.pending}</option>
                <option value="running">{statusLabels.running}</option>
                <option value="completed">{statusLabels.completed}</option>
                <option value="failed">{statusLabels.failed}</option>
              </select>
            )}
            
            {batchAction === "assign_agent" && (
              <input 
                type="text" 
                className="field"
                value={batchAgent}
                onChange={(e) => setBatchAgent(e.target.value)}
                placeholder={text.agent}
                style={{ width: "120px" }}
              />
            )}
            
            {batchAction && batchAction !== "delete" && (
              <button className="button primary" onClick={handleBatchUpdate}>
                {text.batchUpdate}
              </button>
            )}
            
            {batchAction === "delete" && !confirmDelete && (
              <button className="button danger" onClick={() => setConfirmDelete(true)}>
                {text.batchDelete}
              </button>
            )}
            
            {confirmDelete && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--danger)" }}>
                  {text.confirmDelete} {selectedIds.size} {text.confirmDeleteSuffix}
                </span>
                <button className="button danger" onClick={handleBatchDelete}>
                  {text.delete}
                </button>
                <button className="button secondary" onClick={() => setConfirmDelete(false)}>
                  {text.cancel}
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="empty">{text.loading}</div>
        ) : tasks.length === 0 ? (
          <div className="empty">{text.empty}</div>
        ) : (
          <div className="table-shell">
            <div className="table-header">
              <span style={{ width: "40px" }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === tasks.length && tasks.length > 0}
                  onChange={handleSelectAll}
                />
              </span>
              <span>{text.task}</span>
              <span>{text.status}</span>
              <span>{text.agent}</span>
              <span>子Agent</span>
              <span>{text.updatedAt}</span>
              <span>{text.recordId}</span>
            </div>

            {tasks.map((task) => (
              <div
                key={task.taskId}
                className={`table-row ${selectedTaskId === task.taskId ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(task.taskId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(task.taskId);
                  }
                }}
              >
                <span style={{ width: "40px" }} onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(task.taskId)}
                    onChange={() => handleToggleSelect(task.taskId)}
                  />
                </span>
                <span className="task-title">
                  {task.parentTaskId && <span style={{ color: "var(--muted)", fontSize: "0.8em" }}>↳ </span>}
                  <strong>{task.title}</strong>
                  <span>{task.summary || text.noSummary}</span>
                </span>
                <span className={`pill ${task.status}`}>{statusLabels[task.status]}</span>
                <span className="cell-muted">{task.assignedAgent || text.unassigned}</span>
                <span className="cell-muted">{task.subagent || "-"}</span>
                <span className="cell-muted">{formatDateTime(task.updatedAt)}</span>
                <span className="mono">{task.taskId}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
