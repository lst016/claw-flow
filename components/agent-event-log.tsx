import { useEffect, useState } from "react";
import type { AgentEvent, AgentEventType } from "@/lib/types/task";

const text = {
  title: "事件流",
  description: "实时显示 Agent 事件日志。",
  rows: "条",
  event: "事件",
  message: "消息",
  time: "时间",
  filter: "筛选 Agent",
  all: "全部",
  empty: "暂无事件记录。",
  loading: "正在加载事件...",
};

const eventTypeLabels: Record<AgentEventType, string> = {
  agent_spawned: "Agent 启动",
  agent_finished: "Agent 完成",
  agent_error: "Agent 错误",
  agent_heartbeat: "心跳",
  agent_state_changed: "状态变更",
};

const eventTypeColors: Record<AgentEventType, string> = {
  agent_spawned: "completed",
  agent_finished: "completed",
  agent_error: "failed",
  agent_heartbeat: "",
  agent_state_changed: "running",
};

type AgentEventLogProps = {
  events: AgentEvent[];
  agents: { agentId: string; name: string }[];
  loading: boolean;
  filterAgentId: string | null;
  onFilterChange: (agentId: string | null) => void;
  onRefresh: () => void;
};

export function AgentEventLog({ events, agents, loading, filterAgentId, onFilterChange, onRefresh }: AgentEventLogProps) {
  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const filteredEvents = filterAgentId ? events.filter((e) => e.agentId === filterAgentId) : events;

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="pill">
            {filteredEvents.length} {text.rows}
          </span>
        </div>

        <div className="toolbar">
          <select
            className="select"
            value={filterAgentId || ""}
            onChange={(event) => onFilterChange(event.target.value || null)}
          >
            <option value="">{text.all}</option>
            {agents.map((agent) => (
              <option key={agent.agentId} value={agent.agentId}>
                {agent.name}
              </option>
            ))}
          </select>
          <button className="button" onClick={onRefresh} type="button">
            刷新
          </button>
        </div>

        {loading ? (
          <div className="empty">{text.loading}</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty">{text.empty}</div>
        ) : (
          <div className="table-shell">
            <div className="table-header">
              <span>{text.event}</span>
              <span>{text.message}</span>
              <span>{text.time}</span>
            </div>

            {filteredEvents.map((event) => (
              <div key={event.eventId} className="table-row">
                <span className={`pill ${eventTypeColors[event.type]}`}>{eventTypeLabels[event.type]}</span>
                <span className="task-title">
                  <span>{event.message}</span>
                  <span className="mono cell-muted">{event.agentId}</span>
                </span>
                <span className="cell-muted">{new Date(event.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
