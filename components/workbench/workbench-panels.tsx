import { AgentOrgMap } from "@/components/agent-org-map";
import { AgentTaskMonitor } from "@/components/agent-task-monitor";
import { AgentWorkflowEditor } from "@/components/agent-workflow-editor";
import { LogStream } from "@/components/log-stream";
import { StatsOverview } from "@/components/stats-overview";
import { SubAgentManager } from "@/components/subagent-manager";
import { TaskForm, type TaskFormValue } from "@/components/task-form";
import { TaskKanban } from "@/components/task-kanban";
import { TaskList } from "@/components/task-list";
import { TaskOrgMap } from "@/components/task-org-map";
import type { TabId } from "@/lib/workbench/constants";
import type { AgentRecord, TaskRecord, TaskStatus } from "@/lib/types/task";

type WorkbenchPanelsProps = {
  activeTab: TabId;
  tasks: TaskRecord[];
  filteredTasks: TaskRecord[];
  loading: boolean;
  agentLoading: boolean;
  saving: boolean;
  selectedTaskId?: string;
  selectedAgentOrg: AgentRecord | null;
  selectedTaskOrg: TaskRecord | null;
  agents: AgentRecord[];
  form: TaskFormValue;
  onFormChange: (value: TaskFormValue) => void;
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormReset: () => void;
  onSelectTask: (taskId: string) => void;
  onRefreshTasks: () => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onRefreshAgents: () => Promise<void> | void;
  onSelectAgentOrg: (agent: AgentRecord) => void;
  onSelectTaskOrg: (task: TaskRecord) => void;
};

export function WorkbenchPanels({
  activeTab,
  tasks,
  filteredTasks,
  loading,
  agentLoading,
  saving,
  selectedTaskId,
  selectedAgentOrg,
  selectedTaskOrg,
  agents,
  form,
  onFormChange,
  onFormSubmit,
  onFormReset,
  onSelectTask,
  onRefreshTasks,
  onTaskStatusChange,
  onRefreshAgents,
  onSelectAgentOrg,
  onSelectTaskOrg,
}: WorkbenchPanelsProps) {
  if (activeTab === "list") {
    return (
      <div className="main-column full-width">
        <TaskList
          tasks={filteredTasks}
          loading={loading}
          selectedTaskId={selectedTaskId}
          onSelect={onSelectTask}
          onTasksRefresh={onRefreshTasks}
        />
      </div>
    );
  }

  if (activeTab === "kanban") {
    return (
      <div className="main-column full-width">
        <TaskKanban
          tasks={tasks}
          loading={loading}
          selectedTaskId={selectedTaskId}
          onSelect={onSelectTask}
          onTaskStatusChange={onTaskStatusChange}
          onRefresh={onRefreshTasks}
        />
      </div>
    );
  }

  if (activeTab === "agents") {
    return (
      <div className="main-column full-width" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
        <AgentTaskMonitor />
      </div>
    );
  }

  if (activeTab === "subagents") {
    return (
      <div className="main-column full-width" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
        <SubAgentManager />
      </div>
    );
  }

  if (activeTab === "stats") {
    return (
      <div className="main-column full-width" style={{ width: "100%" }}>
        <StatsOverview />
      </div>
    );
  }

  return null;
}
