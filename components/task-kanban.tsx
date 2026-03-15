"use client";

import { useState, useCallback } from "react";
import type { TaskRecord, TaskStatus } from "@/lib/types/task";

const text = {
  title: "看板",
  description: "拖拽任务卡片到不同列以更新状态。",
  empty: "暂无任务",
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  tasks: "个任务",
  dragHint: "拖拽移动任务",
  search: "搜索任务...",
  refresh: "刷新",
  todayOnly: "只看今天",
  all: "全部",
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

const statusColors: Record<TaskStatus, string> = {
  pending: "var(--color-pending, #f59e0b)",
  running: "var(--color-running, #3b82f6)",
  completed: "var(--color-completed, #10b981)",
  failed: "var(--color-failed, #ef4444)",
};

type TaskKanbanProps = {
  tasks: TaskRecord[];
  loading: boolean;
  onSelect: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onRefresh?: () => void;
  selectedTaskId?: string;
};

type Column = {
  id: TaskStatus;
  label: string;
  color: string;
};

const columns: Column[] = [
  { id: "pending", label: text.pending, color: statusColors.pending },
  { id: "running", label: text.running, color: statusColors.running },
  { id: "completed", label: text.completed, color: statusColors.completed },
  { id: "failed", label: text.failed, color: statusColors.failed },
];

export function TaskKanban({
  tasks,
  loading,
  onSelect,
  onTaskStatusChange,
  onRefresh,
  selectedTaskId,
}: TaskKanbanProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query) && 
          !task.summary?.toLowerCase().includes(query)) {
        return false;
      }
    }
    // 今天过滤
    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.updatedAt);
      taskDate.setHours(0, 0, 0, 0);
      if (taskDate.getTime() !== today.getTime()) {
        return false;
      }
    }
    return true;
  });

  // 按状态分组任务
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter((task) => task.status === column.id);
    return acc;
  }, {} as Record<TaskStatus, TaskRecord[]>);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    // 添加拖拽时的视觉反馈
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    // 延迟重置 isDragging，以便区分真正的点击和拖拽结束
    setTimeout(() => setIsDragging(false), 0);
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      
      if (taskId && draggedTaskId) {
        const task = tasks.find((t) => t.taskId === taskId);
        if (task && task.status !== newStatus) {
          onTaskStatusChange(taskId, newStatus);
        }
      }
      
      setDraggedTaskId(null);
      setDragOverColumn(null);
    },
    [draggedTaskId, tasks, onTaskStatusChange]
  );

  const handleTaskClick = useCallback(
    (taskId: string) => {
      // 如果正在拖拽，不触发点击事件
      if (isDragging) {
        return;
      }
      onSelect(taskId);
    },
    [onSelect, isDragging]
  );

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <div className="header-actions">
            <label className="today-toggle">
              <input
                type="checkbox"
                checked={todayOnly}
                onChange={(e) => setTodayOnly(e.target.checked)}
              />
              <span>{todayOnly ? text.todayOnly : text.all}</span>
            </label>
            <input
              type="text"
              className="search-input"
              placeholder={text.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {onRefresh && (
              <button className="refresh-btn" onClick={onRefresh}>
                {text.refresh}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty">加载中...</div>
        ) : (
          <div className="kanban-container">
            {columns.map((column) => {
              const columnTasks = tasksByStatus[column.id] || [];
              const isDragOver = dragOverColumn === column.id;

              return (
                <div
                  key={column.id}
                  className={`kanban-column ${isDragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="kanban-column-header">
                    <span
                      className="kanban-status-dot"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="kanban-column-title">{column.label}</span>
                    <span className="kanban-count">{columnTasks.length}</span>
                  </div>
                  
                  <div className="kanban-card-list">
                    {columnTasks.length === 0 ? (
                      <div className="kanban-empty">
                        {text.empty}
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.taskId}
                          className={`kanban-card ${
                            selectedTaskId === task.taskId ? "selected" : ""
                          } ${draggedTaskId === task.taskId ? "dragging" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.taskId)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleTaskClick(task.taskId)}
                          title={text.dragHint}
                        >
                          <div className="kanban-card-title">{task.title}</div>
                          {task.summary && (
                            <div className="kanban-card-summary">
                              {task.summary.length > 60
                                ? task.summary.slice(0, 60) + "..."
                                : task.summary}
                            </div>
                          )}
                          <div className="kanban-card-meta">
                            {task.assignedAgent && (
                              <span className="kanban-agent">
                                {task.assignedAgent}
                              </span>
                            )}
                            <span className="kanban-id">
                              {task.taskId.slice(-8)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .kanban-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          min-height: 400px;
        }

        .kanban-column {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 8px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          min-height: 300px;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        .kanban-column.drag-over {
          background: var(--accent-bg, #eff6ff);
          box-shadow: inset 0 0 0 2px var(--color-primary, #3b82f6);
        }

        .kanban-column-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .kanban-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kanban-column-title {
          font-weight: 600;
          font-size: 0.9rem;
          flex: 1;
        }

        .kanban-count {
          background: var(--bg-tertiary, #e2e8f0);
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-muted, #64748b);
        }

        .kanban-card-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }

        .kanban-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-muted, #94a3b8);
          font-size: 0.875rem;
          padding: 2rem 0;
        }

        .kanban-card {
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 6px;
          padding: 0.75rem;
          cursor: grab;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          user-select: none;
        }

        .kanban-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: var(--color-primary, #3b82f6);
        }

        .kanban-card.selected {
          border-color: var(--color-primary, #3b82f6);
          box-shadow: 0 0 0 2px var(--accent-bg, #eff6ff);
        }

        .kanban-card.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }

        .kanban-card:active {
          cursor: grabbing;
        }

        .kanban-card-title {
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }

        .kanban-card-summary {
          font-size: 0.75rem;
          color: var(--color-muted, #64748b);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .kanban-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          color: var(--color-muted, #94a3b8);
        }

        .kanban-agent {
          background: var(--bg-tertiary, #f1f5f9);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .kanban-id {
          font-family: monospace;
        }

        @media (max-width: 1024px) {
          .kanban-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .kanban-container {
            grid-template-columns: 1fr;
          }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .today-toggle {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: var(--color-muted, #6b7280);
          cursor: pointer;
        }

        .search-input {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          font-size: 0.875rem;
          width: 180px;
        }

        .refresh-btn {
          padding: 0.375rem 0.75rem;
          background: var(--color-primary, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .refresh-btn:hover {
          background: var(--color-primary-hover, #2563eb);
        }
      `}</style>
    </article>
  );
}
