import { CSSProperties } from "react";
import { Activity, BarChart3, Clock, Rocket, RotateCcw, Zap } from "lucide-react";
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

type TrendTone = "up" | "down" | "stable";

function TrendIndicator({ tone, text, color, title }: { tone: TrendTone; text: string; color: string; title: string }) {
  const iconPath = tone === "up"
    ? "M5 9V1M5 1L1 5M5 1L9 5"
    : tone === "down"
      ? "M5 1V9M5 9L1 5M5 9L9 5"
      : "M1 5H9M9 5L6 2M9 5L6 8";

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "11px",
        fontWeight: 600,
        marginLeft: "6px",
        color,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d={iconPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </span>
  );
}

export default function StatsRow({ stats, isLoading }: Props) {
  const statsNeedRefresh = useDeploymentStore((state) => state.statsNeedRefresh);
  const clearStatsRefresh = useDeploymentStore((state) => state.clearStatsRefresh);
  const fetchStats = useDeploymentStore((state) => state.fetchStats);
  const successRate = stats?.success_rate_7d ?? 0;

  const successColor = useMemo(() => {
    if (successRate > 80) return "var(--status-success-text)";
    if (successRate >= 50) return "var(--status-warning-text)";
    return "var(--status-failed-text)";
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
    gridTemplateColumns: "repeat(5, minmax(170px, 1fr))",
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
    borderLeft: "3px solid transparent",
    minHeight: "150px",
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={skeletonCardStyle}>
            <div style={{ ...skeletonLineStyle, width: "60%" }} />
            <div style={{ ...skeletonLineStyle, width: "40%", height: "20px" }} />
            <div style={{ ...skeletonLineStyle, width: "50%" }} />
          </div>
        ))}
      </div>
    );
  }

  const thirtyAvg = stats?.thirty_day_daily_avg ?? 0;
  const todayTotal = stats?.total_today ?? 0;
  const paceRatio = thirtyAvg > 0 ? todayTotal / thirtyAvg : 0;

  const frequency = paceRatio === 0 || todayTotal === 0
    ? null
    : paceRatio >= 1.5
      ? { label: "Busy day", color: "var(--status-warning-text)" }
      : paceRatio <= 0.4
        ? { label: "Quiet day", color: "var(--text-muted)" }
        : { label: "Normal pace", color: "var(--status-success-text)" };

  const successDiff = successRate - (stats?.success_rate_prev_7d ?? 0);
  const successTrend = successDiff > 2
    ? { tone: "up" as const, text: `+${successDiff.toFixed(0)}%`, color: "var(--status-success-text)" }
    : successDiff < -2
      ? { tone: "down" as const, text: `${successDiff.toFixed(0)}%`, color: "var(--status-failed-text)" }
      : { tone: "stable" as const, text: "Stable", color: "var(--text-muted)" };

  const avgDuration = stats?.avg_duration_7d ?? 0;
  const prevAvgDuration = stats?.avg_duration_prev_7d ?? 0;
  const durationDiff = avgDuration - prevAvgDuration;
  const durationTrend = durationDiff > 30
    ? { tone: "up" as const, text: "Slower", color: "var(--status-failed-text)" }
    : durationDiff < -30
      ? { tone: "down" as const, text: "Faster", color: "var(--status-success-text)" }
      : { tone: "stable" as const, text: "Stable", color: "var(--text-muted)" };

  const sparklineData = stats?.last_7_days ?? [];
  const sparkMax = Math.max(...sparklineData.map((item) => item.total), 0);
  const rollbackCount7d = stats?.rollback_count_7d ?? 0;

  return (
    <div style={statsRowStyle}>
      <div style={{ ...statCardStyle, borderLeftColor: "var(--border-medium)" }}>
        <div style={statHeaderStyle}>
          <span style={statLabelStyle}>Today</span>
          <Rocket size={16} color="var(--text-muted)" />
        </div>
        <div style={statValueStyle}>{stats?.total_today ?? 0}</div>
        <div style={statSubStyle}>deployments</div>
        {frequency ? (
          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              fontWeight: 600,
              color: frequency.color,
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {frequency.label}
          </div>
        ) : null}

        <div style={{ marginTop: "auto" }}>
          <svg width="100%" height="24" viewBox="0 0 140 24" preserveAspectRatio="none" role="img" aria-label="Deployments last 7 days">
            {Array.from({ length: 7 }).map((_, index) => {
              const point = sparklineData[index] ?? { date: "", total: 0 };
              const height = sparkMax === 0 ? 3 : Math.max(3, Math.round((point.total / sparkMax) * 20));
              const x = index * 20 + 1;
              const y = 24 - height;
              const barColor = sparkMax === 0
                ? "var(--border-light)"
                : index === 6
                  ? "var(--accent)"
                  : "var(--border-medium)";

              return (
                <rect
                  key={`${point.date}-${index}`}
                  x={x}
                  y={y}
                  width="18"
                  height={height}
                  rx="2"
                  ry="2"
                  fill={barColor}
                >
                  <title>{`${point.date || "n/a"}: ${point.total} deployments`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>

      <div style={{ ...statCardStyle, borderLeftColor: successColor }}>
        <div style={statHeaderStyle}>
          <span style={{ ...statLabelStyle, color: successColor }}>Success rate</span>
          <BarChart3 size={16} color="var(--text-muted)" />
        </div>
        <div style={{ ...statValueStyle, color: successColor }}>
          {successRate}%
          <TrendIndicator
            tone={successTrend.tone}
            text={successTrend.text}
            color={successTrend.color}
            title="vs previous 7 days"
          />
        </div>
        <div style={statSubStyle}>last 7 days</div>
        {rollbackCount7d > 0 ? (
          <span
            style={{
              marginTop: "5px",
              background: "var(--status-rolledback-bg)",
              border: "1px solid var(--status-rolledback-border)",
              borderRadius: "var(--radius-full)",
              padding: "1px 8px",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--status-rolledback-text)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              width: "fit-content",
            }}
          >
            <RotateCcw size={9} />
            {rollbackCount7d} rollback{rollbackCount7d === 1 ? "" : "s"} this week
          </span>
        ) : null}
      </div>

      <div style={{ ...statCardStyle, borderLeftColor: runningNow > 0 ? "var(--status-running-text)" : "var(--border-medium)" }}>
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

      <div style={{ ...statCardStyle, borderLeftColor: "var(--border-medium)" }}>
        <div style={statHeaderStyle}>
          <span style={statLabelStyle}>Avg duration</span>
          <Clock size={16} color="var(--text-muted)" />
        </div>
        <div style={statValueStyle}>
          {formatDuration(avgDuration)}
          <TrendIndicator
            tone={durationTrend.tone}
            text={durationTrend.text}
            color={durationTrend.color}
            title="vs previous 7 days"
          />
        </div>
        <div style={statSubStyle}>last 7 days</div>
      </div>

      <div style={{ ...statCardStyle, borderLeftColor: "var(--border-medium)" }} title="Average time from code push to live in production">
        <div style={statHeaderStyle}>
          <span style={statLabelStyle}>End-to-end</span>
          <Zap size={16} color="var(--text-muted)" />
        </div>
        <div style={statValueStyle}>{stats?.avg_e2e_seconds ? formatDuration(stats.avg_e2e_seconds) : "—"}</div>
        <div style={statSubStyle}>push to live, 7 days</div>
      </div>
    </div>
  );
}
