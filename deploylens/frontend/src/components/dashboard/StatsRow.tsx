import { useMemo } from "react";
import { DeploymentStats } from "../../store/deploymentStore";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type Props = {
  stats: DeploymentStats | null;
  isLoading: boolean;
};

export default function StatsRow({ stats, isLoading }: Props) {
  const successColor = useMemo(() => {
    const value = stats?.success_rate_7d ?? 0;
    if (value > 80) return "stat-good";
    if (value >= 50) return "stat-warn";
    return "stat-bad";
  }, [stats?.success_rate_7d]);

  const runningColor = (stats?.running_now ?? 0) > 0 ? "stat-info" : "";

  if (isLoading) {
    return (
      <div className="stats-row">
        <div className="stat-card repo-skeleton" />
        <div className="stat-card repo-skeleton" />
        <div className="stat-card repo-skeleton" />
        <div className="stat-card repo-skeleton" />
      </div>
    );
  }

  return (
    <div className="stats-row">
      <div className="stat-card">
        <h4>Today</h4>
        <div className="stat-value">{stats?.total_today ?? 0}</div>
        <p>deployments</p>
      </div>
      <div className={`stat-card ${successColor}`}>
        <h4>Success rate</h4>
        <div className="stat-value">{stats?.success_rate_7d ?? 0}%</div>
        <p>last 7 days</p>
      </div>
      <div className={`stat-card ${runningColor}`}>
        <h4>Running</h4>
        <div className="stat-value">
          {(stats?.running_now ?? 0) > 0 ? <span className="pulse-dot" /> : null}
          {stats?.running_now ?? 0}
        </div>
        <p>in progress</p>
      </div>
      <div className="stat-card">
        <h4>Avg duration</h4>
        <div className="stat-value">{formatDuration(stats?.avg_duration_7d ?? 0)}</div>
        <p>last 7 days</p>
      </div>
    </div>
  );
}
