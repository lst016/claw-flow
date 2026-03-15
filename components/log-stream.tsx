"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { TaskEvent, AgentEvent } from "@/lib/types/task";

interface LogStreamProps {
  taskId?: string;
  agentId?: string;
  type?: "task" | "agent" | "all";
  maxHeight?: string;
  autoScroll?: boolean;
  showFilters?: boolean;
}

type LogEntry = {
  id: string;
  source: "task" | "agent";
  timestamp: string;
  type: string;
  message: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

type EventFilter = {
  source: "all" | "task" | "agent";
  type: string[];
  search: string;
  actor: string;
};

const DEFAULT_FILTER: EventFilter = {
  source: "all",
  type: [],
  search: "",
  actor: "",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  // Task events
  task_created: "#10b981",
  task_updated: "#3b82f6",
  task_completed: "#22c55e",
  task_failed: "#ef4444",
  artifact_saved: "#8b5cf6",
  context_read: "#06b6d4",
  task_claimed: "#f59e0b",
  task_released: "#6b7280",
  // Agent events
  agent_spawned: "#10b981",
  agent_finished: "#3b82f6",
  agent_error: "#ef4444",
  agent_heartbeat: "#6b7280",
  agent_state_changed: "#f59e0b",
};

export function LogStream({
  taskId,
  agentId,
  type = "all",
  maxHeight = "400px",
  autoScroll = true,
  showFilters = true,
}: LogStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<EventFilter>(DEFAULT_FILTER);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (taskId) params.set("taskId", taskId);
    if (agentId) params.set("agentId", agentId);
    return `/api/logs/stream?${params.toString()}`;
  }, [type, taskId, agentId]);

  const connect = useCallback(() => {
    // 清理旧连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = buildUrl();
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError("连接中断，正在重试...");
      // 自动重连
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connect();
        }
      }, 3000);
    };

    eventSource.addEventListener("init", (e) => {
      try {
        const data = JSON.parse(e.data);
        const entries: LogEntry[] = [];
        
        if (data.taskEvents) {
          data.taskEvents.forEach((event: TaskEvent) => {
            entries.push(convertToLogEntry(event, "task"));
          });
        }
        
        if (data.agentEvents) {
          data.agentEvents.forEach((event: AgentEvent) => {
            entries.push(convertToLogEntry(event, "agent"));
          });
        }
        
        // 按时间排序，最新的在前
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(entries);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Failed to parse init event:", err);
      }
    });

    eventSource.addEventListener("task_new", (e) => {
      try {
        const data = JSON.parse(e.data);
        const newEntries = data.events.map((event: TaskEvent) => 
          convertToLogEntry(event, "task")
        );
        setLogs((prev) => [...newEntries, ...prev].slice(0, 500)); // 最多保留500条
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Failed to parse task_new event:", err);
      }
    });

    eventSource.addEventListener("agent_new", (e) => {
      try {
        const data = JSON.parse(e.data);
        const newEntries = data.events.map((event: AgentEvent) => 
          convertToLogEntry(event, "agent")
        );
        setLogs((prev) => [...newEntries, ...prev].slice(0, 500));
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Failed to parse agent_new event:", err);
      }
    });

    eventSource.addEventListener("heartbeat", () => {
      setLastUpdate(new Date());
    });

    // 注意：SSE 的 error 事件不一定会带有 data，这里不做额外处理
    // 连接状态通过 onerror 回调处理
  }, [buildUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0; // 最新的在顶部
    }
  }, [logs, autoScroll]);

  // 过滤日志
  const filteredLogs = logs.filter((log) => {
    if (filter.source !== "all" && log.source !== filter.source) return false;
    if (filter.type.length > 0 && !filter.type.includes(log.type)) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.actor && log.actor !== filter.actor) return false;
    return true;
  });

  // 获取所有唯一的事件类型
  const uniqueTypes = Array.from(new Set(logs.map((log) => log.type)));
  
  // 获取所有唯一的 actor
  const uniqueActors = Array.from(new Set(logs.map((log) => log.actor).filter(Boolean)));

  return (
    <div className="log-stream">
      {/* 头部 */}
      <div className="log-stream-header">
        <div className="log-stream-status">
          <span className={`status-indicator ${connected ? "connected" : "disconnected"}`} />
          <span className="status-text">
            {connected ? "已连接" : "未连接"}
          </span>
          {lastUpdate && (
            <span className="last-update">
              最后更新: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {error && <div className="log-stream-error">{error}</div>}
        
        {showFilters && (
          <div className="log-stream-filters">
            <select
              value={filter.source}
              onChange={(e) => setFilter({ ...filter, source: e.target.value as "all" | "task" | "agent" })}
              className="filter-select"
            >
              <option value="all">全部</option>
              <option value="task">任务事件</option>
              <option value="agent">Agent 事件</option>
            </select>
            
            <input
              type="text"
              placeholder="搜索日志..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="filter-input"
            />
            
            <select
              value={filter.actor}
              onChange={(e) => setFilter({ ...filter, actor: e.target.value })}
              className="filter-select"
            >
              <option value="">全部 Actor</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor!}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div 
        className="log-stream-content" 
        ref={containerRef}
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="log-stream-empty">
            {logs.length === 0 ? "等待事件..." : "没有匹配的日志"}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry">
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span 
                className="log-type"
                style={{ 
                  backgroundColor: EVENT_TYPE_COLORS[log.type] || "#6b7280",
                }}
              >
                {log.source === "task" ? "任务" : "Agent"}:{log.type}
              </span>
              {log.actor && <span className="log-actor">@{log.actor}</span>}
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* 统计信息 */}
      <div className="log-stream-footer">
        <span>共 {filteredLogs.length} 条日志</span>
        {filteredLogs.length !== logs.length && (
          <span>(过滤自 {logs.length} 条)</span>
        )}
      </div>

      <style jsx>{`
        .log-stream {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
        }

        .log-stream-header {
          padding: 12px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .log-stream-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #10b981;
        }

        .status-indicator.disconnected {
          background: #ef4444;
        }

        .status-text {
          font-size: 13px;
          color: #374151;
        }

        .last-update {
          font-size: 12px;
          color: #6b7280;
          margin-left: auto;
        }

        .log-stream-error {
          padding: 8px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 4px;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .log-stream-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-select,
        .filter-input {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          background: #fff;
        }

        .filter-select {
          min-width: 100px;
        }

        .filter-input {
          flex: 1;
          min-width: 150px;
        }

        .log-stream-content {
          overflow-y: auto;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: "SF Mono", Monaco, Consolas, monospace;
          font-size: 12px;
          line-height: 1.6;
        }

        .log-stream-empty {
          padding: 24px;
          text-align: center;
          color: #6b7280;
        }

        .log-entry {
          padding: 4px 12px;
          border-bottom: 1px solid #2d2d2d;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .log-entry:hover {
          background: #2a2a2a;
        }

        .log-time {
          color: #6b7280;
          white-space: nowrap;
        }

        .log-type {
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 10px;
          color: #fff;
          white-space: nowrap;
        }

        .log-actor {
          color: #f59e0b;
          font-size: 11px;
        }

        .log-message {
          flex: 1;
          color: #d4d4d4;
          word-break: break-word;
        }

        .log-stream-footer {
          padding: 8px 12px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

function convertToLogEntry(
  event: TaskEvent | AgentEvent,
  source: "task" | "agent"
): LogEntry {
  const taskEvent = event as TaskEvent;
  return {
    id: event.eventId,
    source,
    timestamp: event.createdAt,
    type: event.type,
    message: event.message,
    actor: source === "task" ? taskEvent.actor : (event as AgentEvent).agentId,
    metadata: event.metadata,
  };
}
