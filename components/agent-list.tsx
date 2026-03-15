import type { AgentRecord, AgentStatus } from "@/lib/types/task";
import { formatDateTime } from "@/lib/utils/date";

const text = {
  title: "Agent 监控",
  description: "实时监控活跃 Agent 的运行状态。",
  rows: "个",
  agent: "Agent",
  status: "状态",
  session: "会话",
  lastHeartbeat: "最后心跳",
  created: "启动时间",
  empty: "暂无活跃的 Agent。",
  loading: "正在加载 Agent 记录...",
  noSession: "无会话",
};

const statusLabels: Record<AgentStatus, string> = {
  idle: "空闲",
  running: "运行中",
  waiting: "等待中",
  completed: "已完成",
  failed: "失败",
};

const statusColors: Record<AgentStatus, string> = {
  idle: "",
  running: "running",
  waiting: "waiting",
  completed: "completed",
  failed: "failed",
};

type AgentListProps = {
  agents: AgentRecord[];
  loading: boolean;
};

export function AgentList({ agents, loading }: AgentListProps) {
  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="pill">
            {agents.length} {text.rows}
          </span>
        </div>

        {loading ? (
          <div className="empty">{text.loading}</div>
        ) : agents.length === 0 ? (
          <div className="empty">{text.empty}</div>
        ) : (
          <div className="table-shell">
            <div className="table-header">
              <span>{text.agent}</span>
              <span>{text.status}</span>
              <span>{text.session}</span>
              <span>{text.lastHeartbeat}</span>
              <span>{text.created}</span>
            </div>

            {agents.map((agent) => (
              <div key={agent.agentId} className="table-row">
                <span className="task-title">
                  <strong>{agent.name}</strong>
                  <span className="mono cell-muted">{agent.agentId}</span>
                </span>
                <span className={`pill ${statusColors[agent.status]}`}>{statusLabels[agent.status]}</span>
                <span className="cell-muted">{agent.sessionId || text.noSession}</span>
                <span className="cell-muted">{formatDateTime(agent.lastHeartbeatAt)}</span>
                <span className="cell-muted">{formatDateTime(agent.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
