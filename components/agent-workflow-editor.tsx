"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentRecord, AgentStatus } from "@/lib/types/task";

const text = {
  title: "Agent Workflow 编辑器",
  description: "按 Agent 维度管理 subagent，可新增、修改、删除。",
  rootAgent: "主 Agent",
  allSubagents: "全部 subagent",
  subagentList: "Subagent 列表",
  noSubagent: "当前主 Agent 下没有 subagent。",
  createSubagent: "新增 subagent",
  subagentName: "名称",
  parent: "父 Agent",
  save: "保存修改",
  create: "创建",
  delete: "删除",
  status: "状态",
  selectSubagent: "请选择要编辑的 subagent",
  creating: "创建中...",
  saving: "保存中...",
  deleting: "删除中...",
  root: "作为根 Agent",
};

const statusOptions: AgentStatus[] = ["idle", "running", "waiting", "completed", "failed"];

type AgentWorkflowEditorProps = {
  agents: AgentRecord[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
};

export function AgentWorkflowEditor({ agents, loading, onRefresh }: AgentWorkflowEditorProps) {
  const [selectedRootId, setSelectedRootId] = useState("");
  const [selectedSubagentId, setSelectedSubagentId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<AgentStatus>("idle");
  const [editParentId, setEditParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const agentMap = useMemo(() => new Map(agents.map((item) => [item.agentId, item])), [agents]);

  const rootAgents = useMemo(() => {
    return agents.filter((agent) => !agent.parentAgentId || !agentMap.has(agent.parentAgentId));
  }, [agentMap, agents]);

  const visibleSubagents = useMemo(() => {
    if (!selectedRootId) {
      return agents.filter((agent) => Boolean(agent.parentAgentId));
    }
    return agents.filter((agent) => agent.parentAgentId === selectedRootId);
  }, [agents, selectedRootId]);

  const selectedSubagent = useMemo(() => {
    if (!selectedSubagentId) {
      return null;
    }
    return agentMap.get(selectedSubagentId) ?? null;
  }, [agentMap, selectedSubagentId]);

  useEffect(() => {
    if (!selectedRootId && rootAgents.length > 0) {
      const initialRootId = rootAgents[0]?.agentId ?? "";
      setSelectedRootId(initialRootId);
      setCreateParentId(initialRootId);
    }
  }, [rootAgents, selectedRootId]);

  useEffect(() => {
    if (createParentId && agentMap.has(createParentId)) {
      return;
    }
    if (selectedRootId) {
      setCreateParentId(selectedRootId);
    }
  }, [agentMap, createParentId, selectedRootId]);

  useEffect(() => {
    if (visibleSubagents.length === 0) {
      setSelectedSubagentId("");
      return;
    }
    const exists = visibleSubagents.some((agent) => agent.agentId === selectedSubagentId);
    if (!exists) {
      setSelectedSubagentId(visibleSubagents[0]?.agentId ?? "");
    }
  }, [selectedSubagentId, visibleSubagents]);

  useEffect(() => {
    if (!selectedSubagent) {
      setEditName("");
      setEditStatus("idle");
      setEditParentId("");
      return;
    }
    setEditName(selectedSubagent.name);
    setEditStatus(selectedSubagent.status);
    setEditParentId(selectedSubagent.parentAgentId ?? "");
  }, [selectedSubagent]);

  async function handleCreateSubagent() {
    if (!createName.trim()) {
      setError("subagent 名称不能为空。");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          parentAgentId: createParentId || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; agent?: AgentRecord };
      if (!response.ok || !payload.agent) {
        throw new Error(payload.error || "创建 subagent 失败。");
      }
      setCreateName("");
      setSelectedSubagentId(payload.agent.agentId);
      await onRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "创建 subagent 失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSubagent() {
    if (!selectedSubagent) {
      return;
    }
    if (!editName.trim()) {
      setError("subagent 名称不能为空。");
      return;
    }
    if (editParentId === selectedSubagent.agentId) {
      setError("父 Agent 不能是自己。");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(selectedSubagent.agentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          status: editStatus,
          parentAgentId: editParentId || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "保存 subagent 失败。");
      }
      await onRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存 subagent 失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubagent() {
    if (!selectedSubagent) {
      return;
    }
    const confirmed = window.confirm(`确认删除 subagent "${selectedSubagent.name}" 吗？`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(selectedSubagent.agentId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "删除 subagent 失败。");
      }
      setSelectedSubagentId("");
      await onRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除 subagent 失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
        </div>

        {error ? <div className="empty" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {loading ? (
          <div className="empty">加载 Agent 中...</div>
        ) : (
          <div className="stack">
            <div className="row">
              <label>{text.rootAgent}</label>
              <select className="select" value={selectedRootId} onChange={(event) => setSelectedRootId(event.target.value)}>
                <option value="">{text.allSubagents}</option>
                {rootAgents.map((agent) => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name} ({agent.agentId})
                  </option>
                ))}
              </select>
            </div>

            <div className="row">
              <label>{text.subagentList}</label>
              <select
                className="select"
                value={selectedSubagentId}
                onChange={(event) => setSelectedSubagentId(event.target.value)}
              >
                <option value="">{text.selectSubagent}</option>
                {visibleSubagents.map((agent) => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name} ({agent.status})
                  </option>
                ))}
              </select>
              {visibleSubagents.length === 0 ? <span className="cell-muted">{text.noSubagent}</span> : null}
            </div>

            <div className="row">
              <label>{text.createSubagent}</label>
              <input
                className="field"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="new-subagent"
              />
              <select className="select" value={createParentId} onChange={(event) => setCreateParentId(event.target.value)}>
                <option value="">{text.root}</option>
                {agents.map((agent) => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <button className="button" type="button" disabled={saving} onClick={handleCreateSubagent}>
                {saving ? text.creating : text.create}
              </button>
            </div>

            {selectedSubagent ? (
              <div className="row">
                <label>{text.subagentName}</label>
                <input className="field" value={editName} onChange={(event) => setEditName(event.target.value)} />

                <label>{text.status}</label>
                <select className="select" value={editStatus} onChange={(event) => setEditStatus(event.target.value as AgentStatus)}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <label>{text.parent}</label>
                <select className="select" value={editParentId} onChange={(event) => setEditParentId(event.target.value)}>
                  <option value="">{text.root}</option>
                  {agents
                    .filter((agent) => agent.agentId !== selectedSubagent.agentId)
                    .map((agent) => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.name}
                      </option>
                    ))}
                </select>

                <div className="actions">
                  <button className="button" type="button" disabled={saving} onClick={handleSaveSubagent}>
                    {saving ? text.saving : text.save}
                  </button>
                  <button className="button danger" type="button" disabled={saving} onClick={handleDeleteSubagent}>
                    {saving ? text.deleting : text.delete}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
