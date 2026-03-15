"use client";

import {
  ReactFlow,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  ConnectionLineType,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import dagre from "dagre";
import type { TaskRecord, TaskStatus } from "@/lib/types/task";

// ── Task Node Component ───────────────────────────────────────────

type TaskNodeData = TaskRecord & Record<string, unknown>;

const statusColors: Record<TaskStatus, string> = {
  pending: "var(--system-orange)",
  running: "var(--system-green)",
  completed: "var(--accent)",
  failed: "var(--system-red)",
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "待处理",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

function TaskNode({ data, selected }: NodeProps) {
  const task = data as TaskNodeData;
  const statusColor = statusColors[task.status] || statusColors.pending;
  const statusLabel = statusLabels[task.status] || "未知";

  return (
    <div
      className={`hover-lift ${selected ? " node-selected" : ""}`}
      title={task.taskId}
      style={{
        background: "var(--material-regular)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRadius: "var(--radius-md)",
        borderTop: `2px solid ${statusColor}`,
        borderRight: `1px solid ${selected ? "var(--accent)" : "var(--separator)"}`,
        borderBottom: `1px solid ${selected ? "var(--accent)" : "var(--separator)"}`,
        borderLeft: `1px solid ${selected ? "var(--accent)" : "var(--separator)"}`,
        padding: "var(--space-3) var(--space-4)",
        width: 240,
        cursor: "pointer",
        position: "relative",
        boxShadow: selected ? "0 0 0 1px var(--accent), var(--shadow-card)" : "var(--shadow-card)",
      }}
    >
      {/* Status indicator + Name row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--text-body)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {task.title}
          </div>
        </div>
      </div>

      {/* Status label */}
      <div
        style={{
          fontSize: "var(--text-caption2)",
          color: statusColor,
          marginBottom: "var(--space-1)",
        }}
      >
        {statusLabel}
      </div>

      {/* Task ID */}
      <div
        style={{
          fontSize: "var(--text-caption2)",
          color: "var(--text-tertiary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {task.taskId.slice(0, 20)}...
      </div>

      {/* Assigned Agent */}
      {task.assignedAgent && (
        <div
          style={{
            fontSize: "var(--text-caption2)",
            color: "var(--accent)",
            background: "var(--accent-fill)",
            padding: "2px 6px",
            borderRadius: 4,
            marginTop: "var(--space-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Agent: {task.assignedAgent}
        </div>
      )}

      {/* Child tasks count */}
      {task.childTaskIds && task.childTaskIds.length > 0 && (
        <div
          style={{
            fontSize: "var(--text-caption2)",
            color: "var(--text-secondary)",
            marginTop: "var(--space-1)",
          }}
        >
          子任务: {task.childTaskIds.length}
        </div>
      )}

      {/* Timestamps */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "var(--space-2)",
          fontSize: "var(--text-caption2)",
          color: "var(--text-tertiary)",
        }}
      >
        <span>创建: {new Date(task.createdAt).toLocaleTimeString("zh-CN")}</span>
      </div>

      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: "var(--text-quaternary)",
          border: "2px solid var(--material-regular)",
        }}
      />
      
      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "var(--text-quaternary)",
          border: "2px solid var(--material-regular)",
        }}
      />
    </div>
  );
}

export const taskNodeTypes = { taskNode: TaskNode };

// ── TaskOrgMap Props ─────────────────────────────────────────────────

interface TaskOrgMapProps {
  tasks: TaskRecord[];
  selectedId: string | null;
  onNodeClick: (task: TaskRecord) => void;
}

const NODE_W = 240;
const NODE_H = 140;

// ── Build edges from parent-child relationships ────────────────────

function buildEdges(tasks: TaskRecord[], selectedId: string | null): Edge[] {
  const taskMap = new Map(tasks.map((t) => [t.taskId, t]));
  const edges: Edge[] = [];

  for (const task of tasks) {
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      const isHighlighted =
        selectedId &&
        (selectedId === task.taskId || selectedId === task.parentTaskId);

      edges.push({
        id: `${task.parentTaskId}-${task.taskId}`,
        source: task.parentTaskId,
        target: task.taskId,
        type: "smoothstep",
        style: {
          stroke: isHighlighted ? "var(--accent)" : "var(--text-quaternary)",
          strokeWidth: isHighlighted ? 2.5 : 1.5,
          opacity: isHighlighted ? 1 : 0.7,
        },
        animated: !!isHighlighted,
        label: isHighlighted ? "子任务" : undefined,
        labelStyle: {
          fontSize: 10,
          fill: "var(--text-secondary)",
        },
      });
    }
  }

  return edges;
}

// ── Dagre layout helper ───────────────────────────────────────────

function dagreLayout(
  nodeIds: string[],
  parentChildEdges: [string, string][],
  opts: { rankdir?: string; nodesep?: number; ranksep?: number } = {},
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.rankdir ?? "TB",
    nodesep: opts.nodesep ?? 60,
    ranksep: opts.ranksep ?? 100,
    marginx: 20,
    marginy: 20,
  });

  for (const id of nodeIds) {
    g.setNode(id, { width: NODE_W, height: NODE_H });
  }
  for (const [src, tgt] of parentChildEdges) {
    g.setEdge(src, tgt);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const id of nodeIds) {
    const n = g.node(id);
    // dagre returns center coords — convert to top-left for React Flow
    positions.set(id, { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 });
  }
  return positions;
}

// ── Build nodes with hierarchy layout ─────────────────────────────

function buildHierarchyLayout(
  tasks: TaskRecord[],
  selectedId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const taskMap = new Map(tasks.map((t) => [t.taskId, t]));

  const allIds = tasks.map((t) => t.taskId);
  const allEdges: [string, string][] = [];

  for (const t of tasks) {
    if (t.parentTaskId && taskMap.has(t.parentTaskId)) {
      allEdges.push([t.parentTaskId, t.taskId]);
    }
  }

  const positions = dagreLayout(allIds, allEdges, { nodesep: 60, ranksep: 120 });

  const nodes: Node[] = [];
  for (const t of tasks) {
    const pos = positions.get(t.taskId);
    if (!pos) continue;
    nodes.push({
      id: t.taskId,
      type: "taskNode",
      data: t,
      position: pos,
      selected: t.taskId === selectedId,
    });
  }

  return { nodes, edges: buildEdges(tasks, selectedId) };
}

// ── Component ────────────────────────────────────────────────────

export function TaskOrgMap({ tasks, selectedId, onNodeClick }: TaskOrgMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildHierarchyLayout(tasks, selectedId),
    [tasks, selectedId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildHierarchyLayout(tasks, selectedId);
    setNodes(n);
    setEdges(e);
  }, [tasks, selectedId, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const task = tasks.find((t) => t.taskId === node.id);
      if (task) onNodeClick(task);
    },
    [tasks, onNodeClick]
  );

  if (tasks.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-tertiary)",
          fontSize: "var(--text-body)",
        }}
      >
        暂无任务数据
      </div>
    );
  }

  // Calculate stats
  const rootTasks = tasks.filter(t => !t.parentTaskId);
  const childTasksCount = tasks.filter(t => t.parentTaskId).length;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={taskNodeTypes}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Controls
        position="bottom-left"
        style={{ left: 16, bottom: 16 }}
      />

      <Panel
        position="top-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          background: "var(--material-regular)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--separator)",
          fontSize: "var(--text-caption1)",
          color: "var(--text-secondary)",
        }}
      >
        <span>{tasks.length} 个任务</span>
        <span style={{ color: "var(--text-quaternary)" }}>|</span>
        <span>根任务: {rootTasks.length}</span>
        <span style={{ color: "var(--text-quaternary)" }}>|</span>
        <span>子任务: {childTasksCount}</span>
      </Panel>
    </ReactFlow>
  );
}
