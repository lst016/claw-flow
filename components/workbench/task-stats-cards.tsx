import { workbenchText, type TaskStats } from "@/lib/workbench/constants";

type TaskStatsCardsProps = {
  stats: TaskStats;
};

export function TaskStatsCards({ stats }: TaskStatsCardsProps) {
  return (
    <section className="stats-grid">
      <article className="stat-card">
        <span className="stat-label">{workbenchText.total}</span>
        <div className="stat-value">{stats.total}</div>
        <div className="stat-meta">{workbenchText.totalMeta}</div>
      </article>
      <article className="stat-card">
        <span className="stat-label">{workbenchText.running}</span>
        <div className="stat-value">{stats.running}</div>
        <div className="stat-meta">{workbenchText.runningMeta}</div>
      </article>
      <article className="stat-card">
        <span className="stat-label">{workbenchText.pending}</span>
        <div className="stat-value">{stats.pending}</div>
        <div className="stat-meta">{workbenchText.pendingMeta}</div>
      </article>
      <article className="stat-card">
        <span className="stat-label">{workbenchText.doneAndFailed}</span>
        <div className="stat-value">
          {stats.completed} / {stats.failed}
        </div>
        <div className="stat-meta">{workbenchText.doneAndFailedMeta}</div>
      </article>
    </section>
  );
}
