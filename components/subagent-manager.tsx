"use client";

import { useState, useEffect } from "react";

type SubAgent = {
  id: string;
  parentAgent: string;
  name: string;
  description?: string;
  tags: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const text = {
  title: "SubAgent 管理",
  description: "配置子 Agent，用于任务分发。调度器会根据任务中的 subagent 字段启动对应的子代理。",
  helpText: "提示：在「创建任务」页面填写 subagent 字段，调度器会自动分发任务给对应的子代理。",
  add: "新增 SubAgent",
  edit: "编辑",
  delete: "删除",
  save: "保存",
  cancel: "取消",
  confirmDelete: "确认删除这个 SubAgent 吗？",
  noSubAgents: "暂无 SubAgent，点击上方按钮添加",
  // Form
  parentAgent: "所属根 Agent",
  name: "名称",
  namePlaceholder: "如：开发、测试、设计",
  desc: "描述",
  descPlaceholder: "可选描述",
  tagList: "标签",
  tagPlaceholder: "用逗号分隔",
  enabled: "启用",
  // Parent agent options
  parentAgents: {
    dev: "dev-assistant",
    main: "main",
    creator: "creator",
    yunying: "yunying",
  },
};

export function SubAgentManager() {
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [formData, setFormData] = useState({
    parentAgent: "dev-assistant",
    name: "",
    description: "",
    tags: "",
    enabled: true,
  });

  // Fetch subagents
  async function loadSubAgents() {
    setLoading(true);
    try {
      const url = filterAgent 
        ? `/api/subagents?parentAgent=${filterAgent}`
        : "/api/subagents";
      const res = await fetch(url);
      const data = await res.json();
      setSubAgents(data.subAgents || []);
    } catch (err) {
      console.error("Failed to load subagents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubAgents();
  }, [filterAgent]);

  // Reset form
  function resetForm() {
    setFormData({
      parentAgent: "dev-assistant",
      name: "",
      description: "",
      tags: "",
      enabled: true,
    });
    setEditingId(null);
    setShowForm(false);
  }

  // Submit form (create or update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const payload = {
      ...formData,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      if (editingId) {
        // Update
        await fetch(`/api/subagents/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        await fetch("/api/subagents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      loadSubAgents();
    } catch (err) {
      console.error("Failed to save subagent:", err);
    }
  }

  // Edit subagent
  function handleEdit(subAgent: SubAgent) {
    setFormData({
      parentAgent: subAgent.parentAgent,
      name: subAgent.name,
      description: subAgent.description || "",
      tags: subAgent.tags?.join(", ") || "",
      enabled: subAgent.enabled,
    });
    setEditingId(subAgent.id);
    setShowForm(true);
  }

  // Delete subagent
  async function handleDelete(id: string) {
    if (!confirm(text.confirmDelete)) return;
    
    try {
      await fetch(`/api/subagents/${id}`, { method: "DELETE" });
      loadSubAgents();
    } catch (err) {
      console.error("Failed to delete subagent:", err);
    }
  }

  // Toggle enabled
  async function toggleEnabled(subAgent: SubAgent) {
    try {
      await fetch(`/api/subagents/${subAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !subAgent.enabled }),
      });
      loadSubAgents();
    } catch (err) {
      console.error("Failed to toggle subagent:", err);
    }
  }

  if (loading) {
    return (
      <div className="subagent-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="subagent-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-info">
          <h3>{text.title}</h3>
          <p>{text.description}</p>
          <p className="help-text">{text.helpText}</p>
        </div>
        <div className="header-actions">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="filter-select"
          >
            <option value="">全部 Agent</option>
            <option value="dev-assistant">dev-assistant</option>
            <option value="main">main</option>
            <option value="creator">creator</option>
            <option value="yunying">yunying</option>
          </select>
          <button onClick={() => setShowForm(true)} className="add-btn">
            + {text.add}
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal-overlay" onClick={resetForm}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? text.edit : text.add}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{text.parentAgent}</label>
                <select
                  value={formData.parentAgent}
                  onChange={(e) => setFormData({ ...formData, parentAgent: e.target.value })}
                  required
                >
                  <option value="dev-assistant">dev-assistant</option>
                  <option value="main">main</option>
                  <option value="creator">creator</option>
                  <option value="yunying">yunying</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>{text.name}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={text.namePlaceholder}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{text.desc}</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={text.descPlaceholder}
                />
              </div>
              
              <div className="form-group">
                <label>{text.tagList}</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder={text.tagPlaceholder}
                />
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  {text.enabled}
                </label>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  {text.cancel}
                </button>
                <button type="submit" className="save-btn">
                  {text.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="subagent-list">
        {subAgents.length === 0 ? (
          <div className="empty-state">{text.noSubAgents}</div>
        ) : (
          subAgents.map((subAgent) => (
            <div key={subAgent.id} className={`subagent-card ${!subAgent.enabled ? "disabled" : ""}`}>
              <div className="card-header">
                <span className="agent-name">{subAgent.name}</span>
                <span className="parent-agent">{subAgent.parentAgent}</span>
              </div>
              {subAgent.description && (
                <div className="card-description">{subAgent.description}</div>
              )}
              {subAgent.tags && subAgent.tags.length > 0 && (
                <div className="card-tags">
                  {subAgent.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="card-footer">
                <label className="toggle-enabled">
                  <input
                    type="checkbox"
                    checked={subAgent.enabled}
                    onChange={() => toggleEnabled(subAgent)}
                  />
                  <span>{subAgent.enabled ? "已启用" : "已禁用"}</span>
                </label>
                <div className="card-actions">
                  <button onClick={() => handleEdit(subAgent)} className="edit-btn">
                    {text.edit}
                  </button>
                  <button onClick={() => handleDelete(subAgent.id)} className="delete-btn">
                    {text.delete}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .subagent-manager {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .subagent-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          gap: 16px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .header-info h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .header-info p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .header-info .help-text {
          margin-top: 8px;
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          background: white;
        }

        .add-btn {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .add-btn:hover {
          background: #2563eb;
        }

        .form-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .form-modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          max-width: 90vw;
        }

        .form-modal h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .cancel-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .save-btn {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .subagent-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          color: #9ca3af;
          font-size: 14px;
        }

        .subagent-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .subagent-card.disabled {
          opacity: 0.6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .agent-name {
          font-weight: 600;
          font-size: 16px;
          color: #111827;
        }

        .parent-agent {
          font-size: 12px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .card-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .tag {
          font-size: 12px;
          padding: 2px 8px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 4px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }

        .toggle-enabled {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
          cursor: pointer;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .edit-btn, .delete-btn {
          padding: 4px 10px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .edit-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .delete-btn {
          background: #fee2e2;
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
