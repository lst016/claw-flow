"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskDetail } from "@/components/task-detail";
import { TaskForm } from "@/components/task-form";
import { TaskList } from "@/components/task-list";
import type { ContextBundle, TaskContextResponse, TaskEvent, TaskRecord, TaskStatus } from "@/lib/types/task";

const text = {
  eyebrow: "\u4efb\u52a1\u6ce8\u518c\u8868",
  title: "Claw \u8bb0\u5fc6\u67e5\u8be2\u53f0",
  description: "\u5916\u7f6e\u4efb\u52a1\u3001\u4e8b\u4ef6\u548c Artifact\uff0c\u51cf\u5c11 subagent \u4e0a\u4e0b\u6587\u6c61\u67d3\u3002",
  loadTasksFailed: "\u52a0\u8f7d\u4efb\u52a1\u5931\u8d25\u3002",
  loadContextFailed: "\u52a0\u8f7d\u4e0a\u4e0b\u6587\u5931\u8d25\u3002",
  createTaskFailed: "\u521b\u5efa\u4efb\u52a1\u5931\u8d25\u3002",
  claimTaskFailed: "\u9886\u53d6\u4efb\u52a1\u5931\u8d25\u3002",
  releaseTaskFailed: "\u91ca\u653e\u4efb\u52a1\u5931\u8d25\u3002",
  updateTaskFailed: "\u66f4\u65b0\u4efb\u52a1\u5931\u8d25\u3002",
  saveArtifactFailed: "\u4fdd\u5b58\u8be6\u7ec6\u5185\u5bb9\u5931\u8d25\u3002",
  saveTaskFailed: "\u4fdd\u5b58\u4efb\u52a1\u5931\u8d25\u3002",
  total: "\u603b\u8bb0\u5f55\u6570",
  totalMeta: "\u5168\u90e8\u4efb\u52a1\u8bb0\u5f55",
  running: "\u6267\u884c\u4e2d",
  runningMeta: "\u8fdb\u884c\u4e2d\u7684\u4efb\u52a1",
  pending: "\u5f85\u5904\u7406",
  pendingMeta: "\u7b49\u5f85\u6267\u884c\u7684\u4efb\u52a1",
  doneAndFailed: "\u5df2\u5b8c\u6210 / \u5931\u8d25",
  doneAndFailedMeta: "\u7ed3\u675f\u6216\u5f02\u5e38\u7684\u4efb\u52a1",
} as const;

type TaskResponse = {
  tasks: TaskRecord[];
};

const emptyForm = {
  title: "",
  summary: "",
  assignedAgent: "root",
};

export default function Page() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [artifact, setArtifact] = useState("");
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [contextBundle, setContextBundle] = useState<ContextBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [statusDraft, setStatusDraft] = useState<TaskStatus>("pending");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [simulatedActor, setSimulatedActor] = useState("root");

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = (await response.json()) as TaskResponse;
      setTasks(payload.tasks);
    } catch {
      setError(text.loadTasksFailed);
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDetail(taskId: string, actor = simulatedActor) {
    setArtifactLoading(true);
    setError("");

    try {
      const [taskResponse, eventsResponse, contextResponse] = await Promise.all([
        fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" }),
        fetch(`/api/tasks/${encodeURIComponent(taskId)}/events`, { cache: "no-store" }),
        fetch(`/api/tasks/${encodeURIComponent(taskId)}/context?actor=${encodeURIComponent(actor)}`, { cache: "no-store" }),
      ]);

      const taskPayload = (await taskResponse.json()) as {
        error?: string;
        task?: TaskRecord;
        artifact?: { content?: string } | null;
      };
      const eventsPayload = (await eventsResponse.json()) as { events?: TaskEvent[] };
      const contextPayload = (await contextResponse.json()) as TaskContextResponse & { error?: string };

      if (!taskResponse.ok || !taskPayload.task) {
        throw new Error(taskPayload.error || text.loadTasksFailed);
      }

      if (!contextResponse.ok || !contextPayload.context) {
        throw new Error(contextPayload.error || text.loadContextFailed);
      }

      setSelectedTask(taskPayload.task);
      setStatusDraft(taskPayload.task.status);
      setSummaryDraft(taskPayload.task.summary);
      setArtifact(taskPayload.artifact?.content ?? "");
      setEvents(eventsPayload.events ?? []);
      setContextBundle(contextPayload.context);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.loadTasksFailed);
    } finally {
      setArtifactLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      loadTaskDetail(selectedTask.taskId, simulatedActor);
    }
  }, [simulatedActor]);

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

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; task?: TaskRecord };
      if (!response.ok || !payload.task) {
        throw new Error(payload.error || text.createTaskFailed);
      }

      setForm(emptyForm);
      await loadTasks();
      await loadTaskDetail(payload.task.taskId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.createTaskFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleClaimTask() {
    if (!selectedTask) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: simulatedActor }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || text.claimTaskFailed);
      }

      await loadTasks();
      await loadTaskDetail(selectedTask.taskId, simulatedActor);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.claimTaskFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleReleaseTask() {
    if (!selectedTask) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(selectedTask.taskId)}/claim?actor=${encodeURIComponent(simulatedActor)}`,
        { method: "DELETE" },
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || text.releaseTaskFailed);
      }

      await loadTasks();
      await loadTaskDetail(selectedTask.taskId, simulatedActor);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.releaseTaskFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTask() {
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
        throw new Error(updatePayload.error || text.updateTaskFailed);
      }

      if (artifact.trim()) {
        const artifactResponse = await fetch(`/api/tasks/${encodeURIComponent(selectedTask.taskId)}/artifact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: artifact, sourceAgent: selectedTask.assignedAgent }),
        });

        const artifactPayload = (await artifactResponse.json()) as { error?: string };
        if (!artifactResponse.ok) {
          throw new Error(artifactPayload.error || text.saveArtifactFailed);
        }
      }

      await loadTasks();
      await loadTaskDetail(selectedTask.taskId, simulatedActor);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.saveTaskFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">{text.eyebrow}</span>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
      </section>

      {error ? (
        <section className="panel error-banner">
          <div className="panel-inner">{error}</div>
        </section>
      ) : null}

      <section className="workspace">
        <div className="main-column">
          <section className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">{text.total}</span>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-meta">{text.totalMeta}</div>
            </article>
            <article className="stat-card">
              <span className="stat-label">{text.running}</span>
              <div className="stat-value">{stats.running}</div>
              <div className="stat-meta">{text.runningMeta}</div>
            </article>
            <article className="stat-card">
              <span className="stat-label">{text.pending}</span>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-meta">{text.pendingMeta}</div>
            </article>
            <article className="stat-card">
              <span className="stat-label">{text.doneAndFailed}</span>
              <div className="stat-value">
                {stats.completed} / {stats.failed}
              </div>
              <div className="stat-meta">{text.doneAndFailedMeta}</div>
            </article>
          </section>

          <TaskList
            tasks={filteredTasks}
            loading={loading}
            selectedTaskId={selectedTask?.taskId}
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelect={loadTaskDetail}
          />
        </div>

        <aside className="side-column">
          <TaskForm
            value={form}
            saving={saving}
            onChange={setForm}
            onSubmit={handleCreateTask}
            onReset={() => setForm(emptyForm)}
          />

          <TaskDetail
            task={selectedTask}
            childTasks={childTasks}
            artifact={artifact}
            artifactLoading={artifactLoading}
            saving={saving}
            statusDraft={statusDraft}
            summaryDraft={summaryDraft}
            events={events}
            contextBundle={contextBundle}
            simulatedActor={simulatedActor}
            onSimulatedActorChange={setSimulatedActor}
            onClaim={handleClaimTask}
            onRelease={handleReleaseTask}
            onStatusChange={setStatusDraft}
            onSummaryChange={setSummaryDraft}
            onArtifactChange={setArtifact}
            onSave={handleSaveTask}
          />
        </aside>
      </section>
    </main>
  );
}
