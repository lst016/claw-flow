import { useState, useEffect } from "react";
import { Chart, getComboChartOption, getBarChartOption } from "./chart";
import type { TaskStats } from "@/lib/types/task";

const text = {
  title: "统计分析",
  description: "查看任务完成率、平均耗时和各状态分布。",
  timeRange: "时间范围",
  today: "今天",
  yesterday: "昨天",
  last7Days: "近7天",
  last30Days: "近30天",
  custom: "自定义",
  from: "开始",
  to: "结束",
  apply: "应用",
  // Stats
  total: "总任务数",
  completionRate: "完成率",
  avgDuration: "平均耗时",
  todayCreated: "今日新增",
  todayCompleted: "今日完成",
  // Status distribution
  statusDistribution: "任务状态分布",
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  // By agent
  byAgent: "按 Agent 统计",
  agent: "Agent",
  completedCount: "已完成",
  failedCount: "失败",
  // By day
  byDay: "每日趋势",
  created: "创建",
  // Token usage
  tokenUsage: "Token 消耗",
  inputTokens: "输入",
  outputTokens: "输出",
  cacheRead: "缓存读取",
  cacheWrite: "缓存写入",
  totalTokens: "总 Token",
  noTokenData: "暂无 Token 数据",
  // By model
  byModel: "按模型统计",
  model: "模型",
  provider: "提供商",
  sessionCount: "会话数",
  messageCount: "消息数",
  noModelData: "暂无模型数据",
  // Loading
  loading: "加载统计数据...",
  error: "加载失败",
};

function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}秒`;
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}分钟`;
  }
  const hours = Math.floor(ms / 3600000);
  const mins = Math.round((ms % 3600000) / 60000);
  return `${hours}小时${mins}分钟`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function StatsOverview() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState<"today" | "yesterday" | "7" | "30" | "custom">("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Helper to get today's date string (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split("T")[0];

  // Helper to get yesterday's date string (YYYY-MM-DD)
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const fetchStats = async (from?: string, to?: string) => {
    setLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      
      const response = await fetch(`/api/stats?${params}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = (await response.json()) as TaskStats;
      setStats(data);
    } catch (err) {
      setError(text.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    let from: string | undefined;
    let to = now.toISOString().split("T")[0];

    if (timeRange === "today") {
      from = getTodayString();
      to = getTodayString();
    } else if (timeRange === "yesterday") {
      from = getYesterdayString();
      to = getYesterdayString();
    } else if (timeRange === "7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
    } else if (timeRange === "30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      from = d.toISOString().split("T")[0];
    } else if (timeRange === "custom" && customFrom && customTo) {
      from = customFrom;
      to = customTo;
    }

    fetchStats(from, to);
  }, [timeRange, customFrom, customTo]);

  const handleTimeRangeChange = (value: "today" | "yesterday" | "7" | "30" | "custom") => {
    setTimeRange(value);
  };

  if (loading) {
    return (
      <article className="panel">
        <div className="panel-inner">
          <div className="panel-header">
            <div>
              <h2>{text.title}</h2>
              <p>{text.description}</p>
            </div>
          </div>
          <div className="empty">{text.loading}</div>
        </div>
      </article>
    );
  }

  if (error || !stats) {
    return (
      <article className="panel">
        <div className="panel-inner">
          <div className="panel-header">
            <div>
              <h2>{text.title}</h2>
              <p>{text.description}</p>
            </div>
          </div>
          <div className="empty error">{error || text.error}</div>
        </div>
      </article>
    );
  }

  const { summary, byAgent, byDay } = stats;
  const maxAgentCount = Math.max(...Object.values(byAgent || {}).map(a => a.total), 1);

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <div className="time-range-selector">
            <div className="date-filter-buttons">
              <button
                className={`date-filter-btn ${timeRange === "today" ? "active" : ""}`}
                onClick={() => handleTimeRangeChange("today")}
              >
                {text.today}
              </button>
              <button
                className={`date-filter-btn ${timeRange === "yesterday" ? "active" : ""}`}
                onClick={() => handleTimeRangeChange("yesterday")}
              >
                {text.yesterday}
              </button>
              <button
                className={`date-filter-btn ${timeRange === "7" ? "active" : ""}`}
                onClick={() => handleTimeRangeChange("7")}
              >
                {text.last7Days}
              </button>
              <button
                className={`date-filter-btn ${timeRange === "30" ? "active" : ""}`}
                onClick={() => handleTimeRangeChange("30")}
              >
                {text.last30Days}
              </button>
              <button
                className={`date-filter-btn ${timeRange === "custom" ? "active" : ""}`}
                onClick={() => handleTimeRangeChange("custom")}
              >
                {text.custom}
              </button>
            </div>
            {timeRange === "custom" && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input 
                  type="date" 
                  className="field"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  placeholder={text.from}
                />
                <input 
                  type="date" 
                  className="field"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  placeholder={text.to}
                />
              </div>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="stats-grid-overview">
          <div className="stat-card">
            <span className="stat-label">{text.total}</span>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">{text.completionRate}</span>
            <div className="stat-value">{(summary.completionRate * 100).toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">{text.avgDuration}</span>
            <div className="stat-value">{formatDuration(summary.averageDurationMs)}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">{text.todayCreated}</span>
            <div className="stat-value">{summary.createdToday}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">{text.todayCompleted}</span>
            <div className="stat-value">{summary.completedToday}</div>
          </div>
        </div>

        {/* Status Distribution */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3>{text.statusDistribution}</h3>
          <div className="status-bars">
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>{text.pending}</span>
                <span>{summary.pending}</span>
              </div>
              <div className="status-bar-track">
                <div 
                  className="status-bar-fill pending" 
                  style={{ width: `${summary.total > 0 ? (summary.pending / summary.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>{text.running}</span>
                <span>{summary.running}</span>
              </div>
              <div className="status-bar-track">
                <div 
                  className="status-bar-fill running" 
                  style={{ width: `${summary.total > 0 ? (summary.running / summary.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>{text.completed}</span>
                <span>{summary.completed}</span>
              </div>
              <div className="status-bar-track">
                <div 
                  className="status-bar-fill completed" 
                  style={{ width: `${summary.total > 0 ? (summary.completed / summary.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>{text.failed}</span>
                <span>{summary.failed}</span>
              </div>
              <div className="status-bar-track">
                <div 
                  className="status-bar-fill failed" 
                  style={{ width: `${summary.total > 0 ? (summary.failed / summary.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* By Agent */}
        {/* By Agent */}
        {byAgent && Object.keys(byAgent).length > 0 && (
          <section style={{ marginTop: "1.5rem" }}>
            <h3>{text.byAgent}</h3>
            <div className="agent-stats">
              {Object.entries(byAgent)
                .sort((a, b) => b[1].completed - a[1].completed)
                .map(([agent, data], index) => (
                  <div key={agent} className="agent-stat-item">
                    <span className="agent-rank">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                    </span>
                    <span className="agent-name">{agent}</span>
                    <span className="agent-stats-detail">
                      {text.completedCount}: {data.completed} / {text.failedCount}: {data.failed}
                    </span>
                    <div className="agent-bar-track">
                      <div 
                        className="agent-bar-fill"
                        style={{ width: `${(data.total / maxAgentCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* By Day Trend - ECharts */}
        {byDay.length > 0 && (
          <section style={{ marginTop: "1.5rem" }}>
            <h3>{text.byDay}</h3>
            <Chart
              option={getComboChartOption(
                byDay.slice(-14).map(d => {
                  const date = new Date(d.date);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }),
                byDay.slice(-14).map(d => d.created),
                byDay.slice(-14).map(d => d.completed),
                text.created,
                text.completed,
                "#3b82f6", // 蓝色 - 创建
                "#10b981"  // 绿色 - 完成
              )}
              height={320}
            />
          </section>
        )}

        {/* Token Usage */}
        {stats.tokenUsage && stats.tokenUsage.totals.totalTokens > 0 && (
          <section style={{ marginTop: "1.5rem" }}>
            <h3>{text.tokenUsage}</h3>
            <div className="stats-grid-overview">
              <div className="stat-card">
                <span className="stat-label">{text.inputTokens}</span>
                <div className="stat-value">{formatNumber(stats.tokenUsage.totals.input)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">{text.outputTokens}</span>
                <div className="stat-value">{formatNumber(stats.tokenUsage.totals.output)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">{text.cacheRead}</span>
                <div className="stat-value">{formatNumber(stats.tokenUsage.totals.cacheRead)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">{text.cacheWrite}</span>
                <div className="stat-value">{formatNumber(stats.tokenUsage.totals.cacheWrite)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">{text.totalTokens}</span>
                <div className="stat-value">{formatNumber(stats.tokenUsage.totals.totalTokens)}</div>
              </div>
            </div>
            {/* Token Usage Bar Chart */}
            {stats.tokenUsage.daily.length > 0 && (
              <Chart
                option={getBarChartOption(
                  stats.tokenUsage.daily.slice(-14).map(d => {
                    const date = new Date(d.date);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }),
                  stats.tokenUsage.daily.slice(-14).map(d => d.totalTokens),
                  "#8b5cf6" // 紫色 - Token
                )}
                height={240}
              />
            )}
          </section>
        )}

        {/* By Model Statistics - Show all models with detailed stats */}
        {stats.modelUsage && stats.modelUsage.models.length > 0 && (
          <section style={{ marginTop: "1.5rem" }}>
            <h3>{text.byModel}</h3>
            <div className="model-stats-table" style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>#</th>
                    <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>{text.model}</th>
                    <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>{text.provider}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>{text.sessionCount}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>{text.messageCount}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>{text.inputTokens}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>{text.outputTokens}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>{text.totalTokens}</th>
                    <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.modelUsage.models
                    .sort((a, b) => b.totalTokens - a.totalTokens)
                    .map((model, index) => {
                      const percentage = ((model.totalTokens / (stats.modelUsage?.totals.totalTokens || 1)) * 100).toFixed(1);
                      return (
                        <tr key={model.modelId} style={{ borderBottom: "1px solid var(--line-2)" }}>
                          <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                          </td>
                          <td style={{ padding: "0.5rem", fontWeight: 500 }} title={model.modelId}>
                            {model.modelId.length > 24 ? model.modelId.substring(0, 24) + "..." : model.modelId}
                          </td>
                          <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{model.provider}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{model.sessionCount}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{model.messageCount}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(model.inputTokens)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(model.outputTokens)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>{formatNumber(model.totalTokens)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <div className="model-bar-track" style={{ width: "60px", height: "6px" }}>
                                <div 
                                  className="model-bar-fill"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : index === 2 ? "#f59e0b" : "#8b5cf6"
                                  }}
                                />
                              </div>
                              <span>{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600, backgroundColor: "var(--panel-soft)" }}>
                    <td colSpan={3} style={{ padding: "0.5rem" }}>总计</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{stats.modelUsage.totals.sessionCount}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{stats.modelUsage.totals.messageCount}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(stats.modelUsage.totals.inputTokens)}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(stats.modelUsage.totals.outputTokens)}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(stats.modelUsage.totals.totalTokens)}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
