"use client";

import { useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { TaskDetail } from "@/components/task-detail";
import { WorkbenchPanels } from "@/components/workbench/workbench-panels";
import { WorkbenchTabNav } from "@/components/workbench/workbench-tab-nav";
import { useTaskWorkbench } from "@/hooks/use-task-workbench";
import { emptyTaskForm, type TabId, workbenchText } from "@/lib/workbench/constants";
import type { AgentRecord, TaskRecord } from "@/lib/types/task";

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>("kanban");
  const [selectedAgentOrg, setSelectedAgentOrg] = useState<AgentRecord | null>(null);
  const [selectedTaskOrg, setSelectedTaskOrg] = useState<TaskRecord | null>(null);

  const {
    tasks,
    filteredTasks,
    selectedTask,
    parentTask,
    childTasks,
    artifact,
    artifactLoading,
    events,
    loading,
    agentLoading,
    saving,
    error,
    form,
    statusDraft,
    summaryDraft,
    agents,
    drawerOpen,
    setForm,
    setStatusDraft,
    setSummaryDraft,
    setArtifact,
    setDrawerOpen,
    loadTasks,
    loadAgents,
    loadTaskDetail,
    handleCreateTask,
    handleClaimTask,
    handleDeleteTask,
    handleSaveTask,
    handleTaskStatusChange,
    handleSelectParentTask,
    handleSelectChildTask,
  } = useTaskWorkbench();

  const handleTaskOrgNodeClick = useCallback((task: TaskRecord) => {
    setSelectedTaskOrg(task);
    void loadTaskDetail(task.taskId);
  }, [loadTaskDetail]);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">{workbenchText.eyebrow}</span>
        <h1>{workbenchText.title}</h1>
        <p>{workbenchText.description}</p>
      </section>

      {error ? (
        <section className="panel error-banner">
          <div className="panel-inner">{error}</div>
        </section>
      ) : null}

      <WorkbenchTabNav activeTab={activeTab} onChange={setActiveTab} />

      <section className="workspace">
        <WorkbenchPanels
          activeTab={activeTab}
          tasks={tasks}
          filteredTasks={filteredTasks}
          loading={loading}
          agentLoading={agentLoading}
          saving={saving}
          selectedTaskId={selectedTask?.taskId}
          selectedAgentOrg={selectedAgentOrg}
          selectedTaskOrg={selectedTaskOrg}
          agents={agents}
          form={form}
          onFormChange={setForm}
          onFormSubmit={handleCreateTask}
          onFormReset={() => setForm(emptyTaskForm)}
          onSelectTask={(taskId) => void loadTaskDetail(taskId)}
          onRefreshTasks={() => void loadTasks()}
          onRefreshAgents={() => void loadAgents()}
          onTaskStatusChange={(taskId, status) => void handleTaskStatusChange(taskId, status)}
          onSelectAgentOrg={setSelectedAgentOrg}
          onSelectTaskOrg={handleTaskOrgNodeClick}
        />
      </section>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedTask ? selectedTask.title : "任务详情"}
        width="520px"
      >
        <TaskDetail
          task={selectedTask}
          parentTask={parentTask}
          childTasks={childTasks}
          artifact={artifact}
          artifactLoading={artifactLoading}
          saving={saving}
          statusDraft={statusDraft}
          summaryDraft={summaryDraft}
          events={events}
          onSelectParentTask={handleSelectParentTask}
          onSelectChildTask={handleSelectChildTask}
          onClaim={handleClaimTask}
          onDelete={handleDeleteTask}
          onStatusChange={setStatusDraft}
          onSummaryChange={setSummaryDraft}
          onArtifactChange={setArtifact}
          onSave={handleSaveTask}
          hideHeader={true}
        />
      </Drawer>
    </main>
  );
}
