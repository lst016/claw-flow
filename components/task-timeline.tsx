import type { TaskEvent, TaskEventType, TaskStatus } from "@/lib/types/task";
import { formatTime } from "@/lib/utils/date";

const text = {
  timeline: "任务流时间轴",
  noEvents: "暂无事件记录",
  spawn: "spawn",
} as const;

type TimelineEvent = {
  eventId: string;
  timestamp: string;
  type: TaskEventType;
  actor?: string;
  message: string;
  metadata?: Record<string, unknown>;
  parentEventId?: string;
};

type TreeNode = {
  event: TimelineEvent;
  children: TreeNode[];
  level: number;
};

// 构建事件树结构
function buildEventTree(events: TaskEvent[]): TreeNode[] {
  if (events.length === 0) return [];

  // 按时间排序
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 找出 spawn 事件作为分支点
  const spawnEvents = new Map<string, TimelineEvent>();
  const regularEvents: TimelineEvent[] = [];

  for (const event of sortedEvents) {
    if (event.type === "task_created" || event.message.includes(text.spawn)) {
      spawnEvents.set(event.eventId, {
        eventId: event.eventId,
        timestamp: event.createdAt,
        type: event.type,
        actor: event.actor,
        message: event.message,
        metadata: event.metadata,
      });
    } else {
      regularEvents.push({
        eventId: event.eventId,
        timestamp: event.createdAt,
        type: event.type,
        actor: event.actor,
        message: event.message,
        metadata: event.metadata,
      });
    }
  }

  // 将常规事件分配到最近的 spawn 事件或根节点
  const root: TreeNode[] = [];
  let currentSpawn: TreeNode | null = null;

  for (const event of sortedEvents) {
    const node: TreeNode = {
      event: {
        eventId: event.eventId,
        timestamp: event.createdAt,
        type: event.type,
        actor: event.actor,
        message: event.message,
        metadata: event.metadata,
      },
      children: [],
      level: 0,
    };

    // 检查是否是 spawn 事件
    if (event.message.includes(text.spawn)) {
      node.level = currentSpawn ? currentSpawn.level + 1 : 1;
      if (currentSpawn) {
        currentSpawn.children.push(node);
      } else {
        root.push(node);
      }
      currentSpawn = node;
    } else if (currentSpawn) {
      node.level = currentSpawn.level + 1;
      currentSpawn.children.push(node);
    } else {
      node.level = 0;
      root.push(node);
    }
  }

  return root;
}

// 事件类型标签
function getEventTypeLabel(type: TaskEventType): string {
  const labels: Record<TaskEventType, string> = {
    task_created: "创建",
    task_updated: "更新",
    task_completed: "完成",
    task_failed: "失败",
    task_claimed: "领取",
    task_released: "释放",
    artifact_saved: "保存",
    context_read: "读取",
  };
  return labels[type] || type;
}

// 事件类型样式
function getEventTypeClass(type: TaskEventType): string {
  if (type === "task_completed") return "completed";
  if (type === "task_failed") return "failed";
  if (type === "task_created") return "created";
  if (type === "task_claimed") return "claimed";
  if (type === "task_released") return "released";
  if (type === "artifact_saved") return "saved";
  if (type === "context_read") return "context";
  return "updated";
}

// 格式化时间
interface TimelineNodeProps {
  node: TreeNode;
  isLast: boolean;
}

function TimelineNode({ node, isLast }: TimelineNodeProps) {
  const { event, children, level } = node;
  const hasChildren = children.length > 0;

  return (
    <div className="timeline-node" style={{ marginLeft: level * 24 }}>
      {/* 连接线 */}
      {!isLast && <div className="timeline-line" />}

      {/* 节点内容 */}
      <div className="timeline-event">
        <div className={`timeline-dot ${getEventTypeClass(event.type)}`} />
        <div className="timeline-content">
          <div className="timeline-header">
            <span className="timeline-time">{formatTime(event.timestamp)}</span>
            <span className={`pill ${getEventTypeClass(event.type)}`}>
              {getEventTypeLabel(event.type)}
            </span>
            {event.actor && <span className="timeline-actor">{event.actor}</span>}
          </div>
          <div className="timeline-message">{event.message}</div>
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && (
        <div className="timeline-children">
          {children.map((child, index) => (
            <TimelineNode
              key={child.event.eventId}
              node={child}
              isLast={index === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskTimelineProps {
  events: TaskEvent[];
}

export function TaskTimeline({ events }: TaskTimelineProps) {
  const tree = buildEventTree(events);

  return (
    <div className="detail-card">
      <p className="section-label">{text.timeline}</p>
      {tree.length === 0 ? (
        <div className="empty">{text.noEvents}</div>
      ) : (
        <div className="timeline">
          {tree.map((node, index) => (
            <TimelineNode key={node.event.eventId} node={node} isLast={index === tree.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
