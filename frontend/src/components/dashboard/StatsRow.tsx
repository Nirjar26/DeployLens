import { CSSProperties } from "react";
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
    if (successRate > 80) return "var(--status-success)";
    if (successRate >= 50) return "var(--status-warning)";
    return "var(--status-failed)";
  }, [successRate]);

  const runningNow = stats?.running_now ?? 0;

  useEffect(() => {
    if (!statsNeedRefresh) {
      return;
    }

    void fetchStats();
    clearStatsRefresh();
  }, [statsNeedRefresh, fetchStats, clearStatsRefresh]);

  const statsRowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  };

  const statCardStyle: CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const statHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  };

  const statLabelStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
  };

  const statValueStyle: CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const statSubStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontWeight: 400,
  };

  const skeletonCardStyle: CSSProperties = {
    ...statCardStyle,
    pointerEvents: "none",
    opacity: 0.6,
  };

  const skeletonLineStyle: CSSProperties = {
    height: "12px",
    backgroundColor: "var(--bg-sunken)",
    borderRadius: "var(--radius-sm)",
    animation: "shimmer 2s infinite",
  };

  const pulseDotStyle: CSSProperties = {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--status-running)",
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  };

  if (isLoading) {
    return (
      <div style={statsRowStyle}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={skeletonCardStyle}>
            <div style={{ ...skeletonLineStyle, width: "60%" }} />
            <div style={{ ...skeletonLineStyle, width: "40%", height: "20px" }} />
            <div style={{ ...skeletonLineStyle, width: "50%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={statsRowStyle}>
      <div style={statCardStyle}>
        <div style={statHeaderStyle}>
          <span style={statLabelStyle}>Today</span>
          <Rocket size={16} color="var(--text-muted)" />
        </div>
        <div style={statValueStyle}>{stats?.total_today ?? 0}</div>
        <div style={statSubStyle}>deployments</div>
      </div>

      <div style={statCardStyle}>
        <div style={statHeaderStyle}>
          <span style={{ ...statLabelStyle, color: successColor }}>Success rate</span>
          <BarChart3 size={16} color="var(--text-muted)" />
        </div>
        <div style={{ ...statValueStyle, color: successColor }}>
          {successRate}%
        </div>
        <div style={statSubStyle}>last 7 days</div>
      </div>

      <div style={statCardStyle}>
        <div style={statHeaderStyle}>
          <span style={{
            ...statLabelStyle,
            color: runningNow > 0 ? "var(--status-running)" : "var(--text-secondary)",
          }}>
            Running
          </span>
          <Activity size={16} color="var(--text-muted)" />
        </div>
        <div style={{
          ...statValueStyle,
          color: runningNow > 0 ? "var(--status-running)" : "var(--text-primary)",
        }}>
          {runningNow > 0 && <span style={pulseDotStyle} />}
          {runningNow}
        </div>
        <div style={statSubStyle}>in progress</div>
      </div>

      <div style={statCardStyle}>
        <div style={statHeaderStyle}>
          <span style={statLabelStyle}>Avg duration</span>
          <Clock size={16} color="var(--text-muted)" />
        </div>
        <div style={statValueStyle}>{formatDuration(stats?.avg_duration_7d ?? 0)}</div>
        <div style={statSubStyle}>last 7 days</div>
      </div>
    </div>
  );
}
