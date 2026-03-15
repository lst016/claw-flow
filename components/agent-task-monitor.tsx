"use client";

import { useEffect, useState, useMemo } from "react";
import type { AgentRecord, TaskRecord, TaskStatus } from "@/lib/types/task";

const text = {
  title: "Agent 监控",
  description: "多 Agent 任务监控面板",
  loading: "加载中...",
  noRootAgents: "暂无 Root Agent",
  noTasks: "暂无任务",
  refresh: "刷新",
  autoRefresh: "自动刷新",
  rootAgent: "Root Agent",
  subAgents: "子 Agent",
  tasks: "任务列表",
  taskCount: "任务数",
  status: {
    pending: "待处理",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
  },
  columns: {
    title: "任务标题",
    status: "状态",
    assigned: "分配给",
    updated: "更新时间",
  },
  allTasks: "全部任务",
  filterAll: "全部",
  filterRunning: "进行中",
  filterPending: "待处理",
  filterCompleted: "已完成",
  filterFailed: "失败",
} as const;

type AgentResponse = {
  agents: AgentRecord[];
};

type TaskResponse = {
  tasks: TaskRecord[];
};

// 预定义的 Root Agent 列表
const ROOT_AGENT_NAMES = [
  "main",
  "dev-assistant",
  "project-manager",
  "creator",
  "yunying",
  "root",
];

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "#6b7280"; // gray
    case "running":
      return "#10b981"; // green
    case "completed":
      return "#3b82f6"; // blue
    case "failed":
      return "#ef4444"; // red
    default:
      return "#6b7280";
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AgentWithStats extends AgentRecord {
  taskCount: number;
  runningCount: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
}

export function AgentTaskMonitor() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  async function loadData() {
    setError("");
    try {
      const [agentsResponse, tasksResponse] = await Promise.all([
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
      ]);

      const agentsPayload = (await agentsResponse.json()) as AgentResponse;
      const tasksPayload = (await tasksResponse.json()) as TaskResponse;

      setAgents(agentsPayload.agents || []);
      setTasks(tasksPayload.tasks || []);
    } catch {
      setError("加载数据失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || loading) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, loading]);

  // 计算 Root Agents（没有 parentAgentId 的 Agent 或在预定义列表中的）
  const rootAgents = useMemo(() => {
    const agentMap = new Map(agents.map((a) => [a.agentId, a]));
    
    // 找出所有 Root Agent
    const rootAgentSet = new Set<string>();
    
    // 1. 没有 parentAgentId 的都是 Root Agent
    for (const agent of agents) {
      if (!agent.parentAgentId) {
        rootAgentSet.add(agent.agentId);
      }
    }
    
    // 2. 添加预定义的 Root Agent（即使它们有 parentAgentId，但如果不存在则显示为占位）
    for (const name of ROOT_AGENT_NAMES) {
      rootAgentSet.add(name);
    }

    // 转换为带统计的对象
    const result: AgentWithStats[] = [];
    for (const agentId of rootAgentSet) {
      const agent = agentMap.get(agentId);
      const agentTasks = tasks.filter(
        (t) => 
          t.assignedAgent === agentId || 
          t.assignedAgent?.startsWith(agentId + ":") ||
          t.assignedAgent?.startsWith(agentId + "_") ||
          t.claimedBy === agentId ||
          t.claimedBy?.startsWith(agentId + ":") ||
          t.claimedBy?.startsWith(agentId + "_")
      );
      
      result.push({
        agentId,
        name: agent?.name || agentId,
        status: agent?.status || "idle",
        parentAgentId: agent?.parentAgentId,
        sessionId: agent?.sessionId,
        currentTaskId: agent?.currentTaskId,
        metadata: agent?.metadata,
        createdAt: agent?.createdAt || new Date().toISOString(),
        updatedAt: agent?.updatedAt || new Date().toISOString(),
        lastHeartbeatAt: agent?.lastHeartbeatAt || new Date().toISOString(),
        expiresAt: agent?.expiresAt || new Date().toISOString(),
        taskCount: agentTasks.length,
        runningCount: agentTasks.filter((t) => t.status === "running").length,
        pendingCount: agentTasks.filter((t) => t.status === "pending").length,
        completedCount: agentTasks.filter((t) => t.status === "completed").length,
        failedCount: agentTasks.filter((t) => t.status === "failed").length,
      });
    }

    // 按名称排序，main 排第一
    return result.sort((a, b) => {
      if (a.name === "main") return -1;
      if (b.name === "main") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [agents, tasks]);

  // 获取子 Agent（属于选中 Agent 的 subagent）
  const subAgents = useMemo(() => {
    if (!selectedAgentId) return [];
    return agents.filter((a) => a.parentAgentId === selectedAgentId);
  }, [agents, selectedAgentId]);

  // 获取选中 Agent 的任务
  const agentTasks = useMemo(() => {
    if (!selectedAgentId) return [];
    return tasks
      .filter((t) => {
        const matchesAgent = 
          t.assignedAgent === selectedAgentId || 
          t.assignedAgent?.startsWith(selectedAgentId + ":") ||
          t.assignedAgent?.startsWith(selectedAgentId + "_") ||
          t.claimedBy === selectedAgentId ||
          t.claimedBy?.startsWith(selectedAgentId + ":") ||
          t.claimedBy?.startsWith(selectedAgentId + "_");
        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        return matchesAgent && matchesStatus;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tasks, selectedAgentId, statusFilter]);

  // 统计信息
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      running: tasks.filter((t) => t.status === "running").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="agent-monitor-loading">
        <div className="loading-spinner" />
        <p>{text.loading}</p>
      </div>
    );
  }

  return (
    <div className="agent-task-monitor">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={loadData}>{text.refresh}</button>
        </div>
      )}

      {/* 顶部 Header */}
      <div className="monitor-header">
        <div className="header-info">
          <h3>{text.title}</h3>
          <p>{text.description}</p>
        </div>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>{text.autoRefresh}</span>
          </label>
          <button onClick={loadData} className="refresh-btn">
            {text.refresh}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">全部</span>
        </div>
        <div className="stat-item running">
          <span className="stat-value">{stats.running}</span>
          <span className="stat-label">{text.status.running}</span>
        </div>
        <div className="stat-item pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">{text.status.pending}</span>
        </div>
        <div className="stat-item completed">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">{text.status.completed}</span>
        </div>
        <div className="stat-item failed">
          <span className="stat-value">{stats.failed}</span>
          <span className="stat-label">{text.status.failed}</span>
        </div>
      </div>

      {/* 主内容区：三栏布局 */}
      <div className="monitor-content">
        {/* 左侧：Root Agent 列表 */}
        <div className="panel root-agents-panel">
          <div className="panel-header">
            <h4>{text.rootAgent}</h4>
            <span className="count">{rootAgents.length}</span>
          </div>
          <div className="agent-list">
            {rootAgents.length === 0 ? (
              <div className="empty-state">{text.noRootAgents}</div>
            ) : (
              rootAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className={`agent-item ${selectedAgentId === agent.agentId ? "selected" : ""}`}
                  onClick={() => setSelectedAgentId(agent.agentId)}
                >
                  <div className="agent-item-header">
                    <span className="agent-name">{agent.name}</span>
                    <span className="task-count">{agent.taskCount}</span>
                  </div>
                  <div className="agent-item-stats">
                    {agent.runningCount > 0 && (
                      <span className="stat running">{agent.runningCount} 运行</span>
                    )}
                    {agent.pendingCount > 0 && (
                      <span className="stat pending">{agent.pendingCount} 待处理</span>
                    )}
                    {agent.completedCount > 0 && (
                      <span className="stat completed">{agent.completedCount} 已完成</span>
                    )}
                    {agent.failedCount > 0 && (
                      <span className="stat failed">{agent.failedCount} 失败</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 中间：子 Agent 列表 */}
        <div className="panel sub-agents-panel">
          <div className="panel-header">
            <h4>{text.subAgents}</h4>
            <span className="count">{subAgents.length}</span>
          </div>
          <div className="agent-list">
            {!selectedAgentId ? (
              <div className="empty-state">请选择左侧的 Root Agent</div>
            ) : subAgents.length === 0 ? (
              <div className="empty-state">暂无子 Agent</div>
            ) : (
              subAgents.map((agent) => (
                <div key={agent.agentId} className="agent-item">
                  <div className="agent-item-header">
                    <span className="agent-name">{agent.name}</span>
                    <span
                      className="agent-status"
                      style={{
                        backgroundColor:
                          agent.status === "running"
                            ? "#10b981"
                            : agent.status === "waiting"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="agent-item-meta">
                    {agent.currentTaskId && (
                      <span className="current-task">当前任务: {agent.currentTaskId.slice(0, 12)}...</span>
                    )}
                    <span className="last-heartbeat">心跳: {formatTime(agent.lastHeartbeatAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：任务列表 */}
        <div className="panel tasks-panel">
          <div className="panel-header">
            <h4>{text.tasks}</h4>
            <span className="count">{agentTasks.length}</span>
          </div>
          
          {/* 状态筛选 */}
          <div className="task-filters">
            <button
              className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              {text.filterAll}
            </button>
            <button
              className={`filter-btn ${statusFilter === "running" ? "active" : ""}`}
              onClick={() => setStatusFilter("running")}
            >
              {text.filterRunning}
            </button>
            <button
              className={`filter-btn ${statusFilter === "pending" ? "active" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              {text.filterPending}
            </button>
            <button
              className={`filter-btn ${statusFilter === "completed" ? "active" : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              {text.filterCompleted}
            </button>
            <button
              className={`filter-btn ${statusFilter === "failed" ? "active" : ""}`}
              onClick={() => setStatusFilter("failed")}
            >
              {text.filterFailed}
            </button>
          </div>

          <div className="task-list">
            {!selectedAgentId ? (
              <div className="empty-state">请选择左侧的 Agent 查看任务</div>
            ) : agentTasks.length === 0 ? (
              <div className="empty-state">{text.noTasks}</div>
            ) : (
              <div className="task-table">
                <div className="task-table-header">
                  <span className="col-title">{text.columns.title}</span>
                  <span className="col-status">{text.columns.status}</span>
                  <span className="col-updated">{text.columns.updated}</span>
                </div>
                {agentTasks.map((task) => (
                  <div key={task.taskId} className="task-row">
                    <span className="col-title">
                      <span className="task-title-text">{task.title}</span>
                      <span className="task-id">{task.taskId.slice(0, 8)}...</span>
                    </span>
                    <span
                      className="col-status"
                      style={{ color: getStatusColor(task.status) }}
                    >
                      <span
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      />
                      {text.status[task.status]}
                    </span>
                    <span className="col-updated">{formatDateTime(task.updatedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .agent-task-monitor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow: hidden;
        }

        .agent-monitor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          gap: 16px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
        }

        .error-banner button {
          padding: 6px 12px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .header-info h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .header-info p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
        }

        .auto-refresh-toggle input {
          cursor: pointer;
        }

        .refresh-btn {
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-btn:hover {
          background: #2563eb;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .stat-item.running .stat-value {
          color: #10b981;
        }

        .stat-item.pending .stat-value {
          color: #6b7280;
        }

        .stat-item.completed .stat-value {
          color: #3b82f6;
        }

        .stat-item.failed .stat-value {
          color: #ef4444;
        }

        .monitor-content {
          display: grid;
          grid-template-columns: 280px 240px 1fr;
          gap: 16px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .panel {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .panel-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: #f3f4f6;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
        }

        .agent-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .agent-item {
          padding: 12px;
          margin-bottom: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .agent-item:hover {
          border-color: #d1d5db;
          background: #f3f4f6;
        }

        .agent-item.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .agent-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .agent-name {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }

        .task-count {
          font-size: 12px;
          color: #6b7280;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .agent-item-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .agent-item-stats .stat {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .agent-item-stats .stat.running {
          background: #d1fae5;
          color: #059669;
        }

        .agent-item-stats .stat.pending {
          background: #f3f4f6;
          color: #6b7280;
        }

        .agent-item-stats .stat.completed {
          background: #dbeafe;
          color: #2563eb;
        }

        .agent-item-stats .stat.failed {
          background: #fee2e2;
          color: #dc2626;
        }

        .agent-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: white;
        }

        .agent-item-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
          color: #6b7280;
          margin-top: 6px;
        }

        .current-task {
          color: #3b82f6;
        }

        .tasks-panel {
          flex: 1;
          min-width: 0;
        }

        .task-filters {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .filter-btn {
          padding: 4px 10px;
          font-size: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #d1d5db;
        }

        .filter-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .task-table {
          display: flex;
          flex-direction: column;
        }

        .task-table-header {
          display: grid;
          grid-template-columns: 1fr 100px 120px;
          gap: 12px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: white;
        }

        .task-row {
          display: grid;
          grid-template-columns: 1fr 100px 120px;
          gap: 12px;
          padding: 10px 12px;
          font-size: 13px;
          border-bottom: 1px solid #f3f4f6;
          align-items: center;
        }

        .task-row:hover {
          background: #f9fafb;
        }

        .col-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .task-title-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #111827;
        }

        .task-id {
          font-size: 11px;
          color: #9ca3af;
          font-family: monospace;
        }

        .col-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .col-updated {
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
