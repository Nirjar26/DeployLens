import { Activity, BarChart3, Clock, Rocket } from "lucide-react";
import { useEffect, useMemo } from "react";
import { DeploymentStats } from "../../store/deploymentStore";
import { useDeploymentStore } from "../../store/deploymentStore";

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
  const statsNeedRefresh = useDeploymentStore((state) => state.statsNeedRefresh);
  const clearStatsRefresh = useDeploymentStore((state) => state.clearStatsRefresh);
  const fetchStats = useDeploymentStore((state) => state.fetchStats);
  const successRate = stats?.success_rate_7d ?? 0;

  const successColor = useMemo(() => {
    if (successRate > 80) return "#16a34a";
    if (successRate >= 50) return "#d97706";
    return "#dc2626";
  }, [successRate]);

  const runningNow = stats?.running_now ?? 0;

  useEffect(() => {
    if (!statsNeedRefresh) {
      return;
    }

    void fetchStats();
    clearStatsRefresh();
  }, [statsNeedRefresh, fetchStats, clearStatsRefresh]);

  if (isLoading) {
    return (
      <div className="dl-stats-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dl-stat-card dl-skeleton-card">
            <div className="dl-skeleton-line" style={{ width: "60%" }} />
            <div className="dl-skeleton-line dl-skeleton-big" style={{ width: "40%" }} />
            <div className="dl-skeleton-line" style={{ width: "50%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dl-stats-row">
      <div className="dl-stat-card">
        <div className="dl-stat-header">
          <span className="dl-stat-label">Today</span>
          <Rocket size={16} className="dl-stat-icon" />
        </div>
        <div className="dl-stat-value">{stats?.total_today ?? 0}</div>
        <div className="dl-stat-sub">deployments</div>
      </div>

      <div className="dl-stat-card">
        <div className="dl-stat-header">
          <span className="dl-stat-label" style={{ color: successColor }}>Success rate</span>
          <BarChart3 size={16} className="dl-stat-icon" />
        </div>
        <div className="dl-stat-value" style={{ color: successColor }}>
          {successRate}%
        </div>
        <div className="dl-stat-sub">last 7 days</div>
      </div>

      <div className="dl-stat-card">
        <div className="dl-stat-header">
          <span className="dl-stat-label" style={runningNow > 0 ? { color: "#2563eb" } : undefined}>Running</span>
          <Activity size={16} className="dl-stat-icon" />
        </div>
        <div className="dl-stat-value" style={runningNow > 0 ? { color: "#2563eb" } : undefined}>
          {runningNow > 0 && <span className="dl-pulse-dot" />}
          {runningNow}
        </div>
        <div className="dl-stat-sub">in progress</div>
      </div>

      <div className="dl-stat-card">
        <div className="dl-stat-header">
          <span className="dl-stat-label">Avg duration</span>
          <Clock size={16} className="dl-stat-icon" />
        </div>
        <div className="dl-stat-value">{formatDuration(stats?.avg_duration_7d ?? 0)}</div>
        <div className="dl-stat-sub">last 7 days</div>
      </div>
    </div>
  );
}
