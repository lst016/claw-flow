import type { TabId } from "@/lib/workbench/constants";
import { workbenchText } from "@/lib/workbench/constants";

type WorkbenchTabNavProps = {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
};

export function WorkbenchTabNav({ activeTab, onChange }: WorkbenchTabNavProps) {
  return (
    <nav className="tab-nav">
      <span className="tab-group-title">任务</span>
      <button className={`tab-button ${activeTab === "kanban" ? "active" : ""}`} onClick={() => onChange("kanban")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="18" rx="1" />
          <rect x="14" y="3" width="7" height="10" rx="1" />
        </svg>
        {workbenchText.tabKanban}
      </button>
      <button className={`tab-button ${activeTab === "list" ? "active" : ""}`} onClick={() => onChange("list")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        {workbenchText.tabList}
      </button>

      <div className="tab-group-divider" />

      <span className="tab-group-title">Agent</span>
      <button className={`tab-button ${activeTab === "agents" ? "active" : ""}`} onClick={() => onChange("agents")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {workbenchText.tabAgents}
      </button>
      <button className={`tab-button ${activeTab === "subagents" ? "active" : ""}`} onClick={() => onChange("subagents")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        {workbenchText.tabSubAgents}
      </button>

      <div className="tab-group-divider" />

      <span className="tab-group-title">数据</span>
      <button className={`tab-button ${activeTab === "stats" ? "active" : ""}`} onClick={() => onChange("stats")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        {workbenchText.tabStats}
      </button>
    </nav>
  );
}
