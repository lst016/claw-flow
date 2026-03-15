"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskFormValue } from "@/components/task-form";
import { emptyTaskForm, type StatusFilter, workbenchText } from "@/lib/workbench/constants";
import type { AgentRecord, TaskEvent, TaskRecord, TaskStatus } from "@/lib/types/task";

type TaskResponse = {
  tasks: TaskRecord[];
};

export function useTaskWorkbench() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [parentTask, setParentTask] = useState<TaskRecord | null>(null);
  const [artifact, setArtifact] = useState("");
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TaskFormValue>(emptyTaskForm);
  const [statusDraft, setStatusDraft] = useState<TaskStatus>("pending");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentLoading, setAgentLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = (await response.json()) as TaskResponse;
      setTasks(payload.tasks);
    } catch {
      setError(workbenchText.loadTasksFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    setAgentLoading(true);

    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      const payload = (await response.json()) as { agents?: AgentRecord[] };
      if (payload.agents) {
        setAgents(payload.agents);
      }
    } catch {
      // ignore silently for monitor-related tabs
    } finally {
      setAgentLoading(false);
    }
  }, []);

  const loadTaskDetail = useCallback(async (taskId: string) => {
    setArtifactLoading(true);
    setError("");

    try {
      const [taskResponse, eventsResponse] = await Promise.all([
        fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" }),
        fetch(`/api/tasks/${encodeURIComponent(taskId)}/events`, { cache: "no-store" }),
      ]);

      const taskPayload = (await taskResponse.json()) as {
        error?: string;
        task?: TaskRecord;
        artifact?: { content?: string } | null;
      };
      const eventsPayload = eventsResponse.ok
        ? ((await eventsResponse.json()) as { events?: TaskEvent[] })
        : { events: [] };

      if (!taskResponse.ok || !taskPayload.task) {
        throw new Error(taskPayload.error || workbenchText.loadTasksFailed);
      }

      const task = taskPayload.task;
      setSelectedTask(task);
      setStatusDraft(task.status);
      setSummaryDraft(task.summary);
      setArtifact(taskPayload.artifact?.content ?? "");
      setEvents(eventsPayload.events ?? []);

      if (task.parentTaskId) {
        try {
          const parentResponse = await fetch(`/api/tasks/${encodeURIComponent(task.parentTaskId)}`, { cache: "no-store" });
          if (parentResponse.ok) {
            const parentPayload = (await parentResponse.json()) as { task?: TaskRecord };
            setParentTask(parentPayload.task ?? null);
          } else {
            setParentTask(null);
          }
        } catch {
          setParentTask(null);
        }
      } else {
        setParentTask(null);
      }

      setDrawerOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.loadTasksFailed);
    } finally {
      setArtifactLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
    void loadAgents();
  }, [loadAgents, loadTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const keyword = search.toLowerCase();
      const matchesSearch =
        search.trim().length === 0 ||
        task.title.toLowerCase().includes(keyword) ||
        task.taskId.toLowerCase().includes(keyword) ||
        (task.assignedAgent || "").toLowerCase().includes(keyword);

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tasks]);

  const childTasks = useMemo(() => {
    if (!selectedTask) {
      return [];
    }

    return tasks.filter((item) => item.parentTaskId === selectedTask.taskId);
  }, [selectedTask, tasks]);

  const stats = useMemo(() => {
    const running = tasks.filter((task) => task.status === "running").length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const failed = tasks.filter((task) => task.status === "failed").length;
    return { running, completed, pending, failed, total: tasks.length };
  }, [tasks]);

  const handleCreateTask = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const requestBody: Record<string, unknown> = { ...form };
      if (!form.parentTaskId) {
        delete requestBody.parentTaskId;
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json()) as { error?: string; task?: TaskRecord };
      if (!response.ok || !payload.task) {
        throw new Error(payload.error || workbenchText.createTaskFailed);
      }

      setForm(emptyTaskForm);
      await loadTasks();
      await loadTaskDetail(payload.task.taskId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.createTaskFailed);
    } finally {
      setSaving(false);
    }
  }, [form, loadTaskDetail, loadTasks]);

  const handleClaimTask = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "root" }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || workbenchText.claimTaskFailed);
      }

      await loadTasks();
      await loadTaskDetail(selectedTask.taskId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.claimTaskFailed);
    } finally {
      setSaving(false);
    }
  }, [loadTaskDetail, loadTasks, selectedTask]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("确认彻底删除该任务吗？删除后不可恢复。");
      if (!confirmed) {
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || workbenchText.deleteTaskFailed);
      }

      await loadTasks();
      setSelectedTask(null);
      setParentTask(null);
      setArtifact("");
      setEvents([]);
      setDrawerOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.deleteTaskFailed);
    } finally {
      setSaving(false);
    }
  }, [loadTasks, selectedTask]);

  const handleSaveTask = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updateResponse = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDraft,
          summary: summaryDraft,
          assignedAgent: selectedTask.assignedAgent,
        }),
      });

      const updatePayload = (await updateResponse.json()) as { error?: string };
      if (!updateResponse.ok) {
        throw new Error(updatePayload.error || workbenchText.updateTaskFailed);
      }

      if (artifact.trim()) {
        const artifactResponse = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}/artifact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: artifact, sourceAgent: selectedTask.assignedAgent }),
        });

        const artifactPayload = (await artifactResponse.json()) as { error?: string };
        if (!artifactResponse.ok) {
          throw new Error(artifactPayload.error || workbenchText.saveArtifactFailed);
        }
      }

      await loadTasks();
      await loadTaskDetail(selectedTask.taskId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.saveTaskFailed);
    } finally {
      setSaving(false);
    }
  }, [artifact, loadTaskDetail, loadTasks, selectedTask, statusDraft, summaryDraft]);

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || workbenchText.updateTaskFailed);
      }

      await loadTasks();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : workbenchText.updateTaskFailed);
    } finally {
      setSaving(false);
    }
  }, [loadTasks]);

  const handleSelectParentTask = useCallback((taskId: string) => {
    void loadTaskDetail(taskId);
  }, [loadTaskDetail]);

  const handleSelectChildTask = useCallback((taskId: string) => {
    void loadTaskDetail(taskId);
  }, [loadTaskDetail]);

  return {
    tasks,
    filteredTasks,
    selectedTask,
    parentTask,
    childTasks,
    artifact,
    artifactLoading,
    events,
    loading,
    saving,
    error,
    form,
    statusDraft,
    summaryDraft,
    search,
    statusFilter,
    agents,
    agentLoading,
    drawerOpen,
    stats,
    setForm,
    setStatusDraft,
    setSummaryDraft,
    setArtifact,
    setSearch,
    setStatusFilter,
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
  };
}
