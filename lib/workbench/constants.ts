import type { TaskStatus } from "@/lib/types/task";
import type { TaskFormValue } from "@/components/task-form";

export const workbenchText = {
  eyebrow: "任务分发",
  title: "Claw 任务中心",
  description: "任务调度、子Agent管理、统计概览。",
  loadTasksFailed: "加载任务失败。",
  createTaskFailed: "创建任务失败。",
  claimTaskFailed: "领取任务失败。",
  deleteTaskFailed: "删除任务失败。",
  updateTaskFailed: "更新任务失败。",
  saveArtifactFailed: "保存详细内容失败。",
  saveTaskFailed: "保存任务失败。",
  total: "总记录数",
  totalMeta: "全部任务记录",
  running: "执行中",
  runningMeta: "进行中的任务",
  pending: "待处理",
  pendingMeta: "等待执行的任务",
  doneAndFailed: "已完成 / 失败",
  doneAndFailedMeta: "结束或异常的任务",
  tabKanban: "看板",
  tabList: "列表",
  tabAgents: "Agent",
  tabSubAgents: "子代理",
  tabStats: "统计",
} as const;

export type TabId = "kanban" | "list" | "agents" | "subagents" | "stats";

export type TaskStats = {
  running: number;
  completed: number;
  pending: number;
  failed: number;
  total: number;
};

export const emptyTaskForm: TaskFormValue = {
  title: "",
  summary: "",
  assignedAgent: "dev-assistant",
  subagent: "",
  parentTaskId: "",
};

export type StatusFilter = TaskStatus | "all";
