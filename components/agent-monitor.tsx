"use client";

import { useEffect, useState, useRef } from "react";
import type { AgentEvent, AgentRecord } from "@/lib/types/task";

const text = {
  title: "Agent 监控",
  description: "实时监控所有活跃 Agent 的执行状态和事件流",
  loading: "加载中...",
  noAgents: "暂无活跃的 Agent",
  refresh: "刷新",
  status: {
    idle: "空闲",
    running: "运行中",
    waiting: "等待中",
    completed: "已完成",
    failed: "失败",
  },
  events: "事件流",
  noEvents: "暂无事件",
  agentId: "Agent ID",
  name: "名称",
  statusLabel: "状态",
  parentId: "父级 Agent",
  taskId: "当前任务",
  sessionId: "会话 ID",
  lastHeartbeat: "最后心跳",
  created: "创建时间",
  spawned: "Agent 启动",
  finished: "Agent 结束",
  error: "错误",
  heartbeat: "心跳",
  stateChanged: "状态变更",
} as const;

type AgentResponse = {
  agents: AgentRecord[];
};

type AgentEventsResponse = {
  events: AgentEvent[];
};

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getEventTypeLabel(type: string) {
  switch (type) {
    case "agent_spawned":
      return text.spawned;
    case "agent_finished":
      return text.finished;
    case "agent_error":
      return text.error;
    case "agent_heartbeat":
      return text.heartbeat;
    case "agent_state_changed":
      return text.stateChanged;
    default:
      return type;
  }
}

function getEventTypeColor(type: string) {
  switch (type) {
    case "agent_spawned":
      return "#10b981"; // green
    case "agent_finished":
      return "#6366f1"; // indigo
    case "agent_error":
      return "#ef4444"; // red
    case "agent_heartbeat":
      return "#3b82f6"; // blue
    case "agent_state_changed":
      return "#f59e0b"; // amber
    default:
      return "#6b7280"; // gray
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "running":
      return "#10b981"; // green
    case "waiting":
      return "#f59e0b"; // amber
    case "completed":
      return "#3b82f6"; // blue
    case "failed":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
}

function getStatusLabel(status: string) {
  return text.status[status as keyof typeof text.status] || status;
}

export function AgentMonitor() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  async function loadAgents() {
    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      const payload = (await response.json()) as AgentResponse;
      setAgents(payload.agents || []);
    } catch {
      // Silently fail for background refresh
    }
  }

  async function loadEvents() {
    try {
      const response = await fetch("/api/agents/events", { cache: "no-store" });
      const payload = (await response.json()) as AgentEventsResponse;
      setEvents(payload.events || []);
    } catch {
      // Silently fail for background refresh
    }
  }

  async function loadAll() {
    setError("");
    try {
      const [agentsResponse, eventsResponse] = await Promise.all([
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/agents/events", { cache: "no-store" }),
      ]);

      const agentsPayload = (await agentsResponse.json()) as AgentResponse;
      const eventsPayload = (await eventsResponse.json()) as AgentEventsResponse;

      setAgents(agentsPayload.agents || []);
      setEvents(eventsPayload.events || []);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Auto refresh every 3 seconds
  useEffect(() => {
    if (!autoRefresh || loading) return;

    const interval = setInterval(() => {
      loadAgents();
      loadEvents();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, loading]);

  // Scroll to bottom when new events arrive
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  if (loading) {
    return (
      <div className="agent-monitor-loading">
        <div className="loading-spinner" />
        <p>{text.loading}</p>
      </div>
    );
  }

  return (
    <div className="agent-monitor">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={loadAll}>{text.refresh}</button>
        </div>
      )}

      <div className="agent-monitor-header">
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
            <span>自动刷新</span>
          </label>
          <button onClick={loadAll} className="refresh-btn">
            {text.refresh}
          </button>
        </div>
      </div>

      <div className="agent-monitor-content">
        {/* Agent List */}
        <div className="agent-list-panel">
          <h4>
            活跃 Agent
            <span className="count">{agents.length}</span>
          </h4>
          
          {agents.length === 0 ? (
            <div className="empty-state">
              <p>{text.noAgents}</p>
            </div>
          ) : (
            <div className="agent-cards">
              {agents.map((agent) => (
                <div key={agent.agentId} className="agent-card">
                  <div className="agent-card-header">
                    <span className="agent-name">{agent.name}</span>
                    <span
                      className="agent-status"
                      style={{ backgroundColor: getStatusColor(agent.status) }}
                    >
                      {getStatusLabel(agent.status)}
                    </span>
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-info-row">
                      <span className="label">{text.agentId}:</span>
                      <span className="value">{agent.agentId}</span>
                    </div>
                    {agent.parentAgentId && (
                      <div className="agent-info-row">
                        <span className="label">{text.parentId}:</span>
                        <span className="value">{agent.parentAgentId}</span>
                      </div>
                    )}
                    {agent.currentTaskId && (
                      <div className="agent-info-row">
                        <span className="label">{text.taskId}:</span>
                        <span className="value">{agent.currentTaskId}</span>
                      </div>
                    )}
                    <div className="agent-info-row">
                      <span className="label">{text.lastHeartbeat}:</span>
                      <span className="value">{formatTime(agent.lastHeartbeatAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Stream */}
        <div className="event-stream-panel">
          <h4>
            {text.events}
            <span className="count">{events.length}</span>
          </h4>
          
          {events.length === 0 ? (
            <div className="empty-state">
              <p>{text.noEvents}</p>
            </div>
          ) : (
            <div className="event-stream">
              {events.map((event) => (
                <div
                  key={event.eventId}
                  className="event-item"
                  style={{ borderLeftColor: getEventTypeColor(event.type) }}
                >
                  <div className="event-header">
                    <span
                      className="event-type"
                      style={{ color: getEventTypeColor(event.type) }}
                    >
                      {getEventTypeLabel(event.type)}
                    </span>
                    <span className="event-time">{formatTime(event.createdAt)}</span>
                  </div>
                  <div className="event-message">{event.message}</div>
                  {event.metadata && (
                    <div className="event-meta">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <span key={key} className="meta-item">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .agent-monitor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
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

        .agent-monitor-header {
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

        .agent-monitor-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          flex: 1;
          min-height: 0;
        }

        .agent-list-panel,
        .event-stream-panel {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .agent-list-panel h4,
        .event-stream-panel h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
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
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          color: #9ca3af;
        }

        .agent-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          overflow-y: auto;
        }

        .agent-card {
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .agent-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .agent-name {
          font-weight: 600;
          color: #111827;
        }

        .agent-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .agent-card-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .agent-info-row {
          display: flex;
          gap: 8px;
          font-size: 12px;
        }

        .agent-info-row .label {
          color: #6b7280;
          min-width: 80px;
        }

        .agent-info-row .value {
          color: #374151;
          word-break: break-all;
        }

        .event-stream {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .event-item {
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 4px;
          border-left: 3px solid;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .event-type {
          font-size: 12px;
          font-weight: 600;
        }

        .event-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .event-message {
          font-size: 13px;
          color: #374151;
        }

        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
        }

        .meta-item {
          font-size: 11px;
          padding: 2px 6px;
          background: #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
