import { CSSProperties, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, X } from "lucide-react";
import { useDeploymentStore } from "../../store/deploymentStore";
import { formatElapsed } from "../../lib/formatters";

type Props = {
  onOpenPanel?: () => void;
};

const PULSE_DOT_COLOR = "var(--status-running-text)";

export default function InsightBar({ onOpenPanel }: Props) {
  const deployments = useDeploymentStore((state) => state.deployments);
  const stats = useDeploymentStore((state) => state.stats);
  const setFilter = useDeploymentStore((state) => state.setFilter);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);
  const [tick, setTick] = useState(Date.now());

  // Update timer every second for live elapsed times
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get running deployments
  const runningDeployments = useMemo(
    () => deployments.filter((d) => d.unified_status === "running"),
    [deployments]
  );

  // Get long running deployments
  const avgSeconds = stats?.avg_duration_7d ?? 0;
  const longRunningDeployment = useMemo(() => {
    if (avgSeconds <= 0 || runningDeployments.length === 0) return null;

    for (const d of runningDeployments) {
      if (!d.started_at) continue;
      const elapsed = Math.max(0, Math.floor((tick - new Date(d.started_at).getTime()) / 1000));
      if (elapsed > avgSeconds * 2) {
        return { deployment: d, elapsed };
      }
    }
    return null;
  }, [runningDeployments, avgSeconds, tick]);

  // Get last good deploy (most recent success)
  const lastGoodDeploy = useMemo(() => {
    const success = deployments.find((d) => d.unified_status === "success");
    return success || null;
  }, [deployments]);

  // Get failed prod deployments in last 24h
  const failedProdDeployments = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return deployments.filter((d) => {
      const isFailedRecently =
        d.unified_status === "failed" &&
        d.created_at &&
        new Date(d.created_at) > twentyFourHoursAgo;

      const isProd =
        d.environment?.color_tag === "#ef4444" ||
        (d.environment?.display_name &&
          d.environment.display_name.toLowerCase().includes("prod"));

      return isFailedRecently && isProd;
    });
  }, [deployments]);

  // Get top deployers
  const topDeployers = useMemo(() => {
    return (stats?.top_deployers ?? []).slice(0, 3);
  }, [stats]);

  const containerStyle: CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "0 16px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    gap: "0",
    marginBottom: "14px",
    boxShadow: "var(--shadow-xs)",
    overflow: "hidden",
  };

  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 14px",
    height: "44px",
    borderRight: "1px solid var(--border-light)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background var(--transition-fast)",
  };

  const lastChipStyle: CSSProperties = {
    ...chipStyle,
    borderRight: "none",
  };

  const pulseStyle: CSSProperties = {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "var(--radius-full)",
    backgroundColor: PULSE_DOT_COLOR,
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  };

  // If nothing to show, display "All systems nominal"
  const hasContent =
    runningDeployments.length > 0 ||
    longRunningDeployment ||
    lastGoodDeploy ||
    failedProdDeployments.length > 0;

  if (!hasContent) {
    return (
      <div style={containerStyle}>
        <div style={{ ...lastChipStyle, cursor: "default" }}>
          <CheckCircle2 size={14} color="var(--status-success-text)" />
          <span style={{ color: "var(--text-muted)" }}>
            All systems nominal
            {stats?.success_rate_7d ? ` — ${Math.round(stats.success_rate_7d)}% success this week` : ""}
          </span>
        </div>
      </div>
    );
  }

  const chips: Array<{
    id: string;
    content: JSX.Element;
    onClick?: () => void;
    bgColor?: string;
    isLast?: boolean;
  }> = [];

  // Chip 1: Active Deployments
  if (runningDeployments.length > 0) {
    chips.push({
      id: "running",
      content: (
        <>
          <div style={pulseStyle} />
          <span style={{ fontWeight: 600, color: "var(--status-running-text)" }}>
            {runningDeployments.length > 1
              ? `${runningDeployments.length} deploying`
              : `${runningDeployments[0].repository.name} → ${runningDeployments[0].environment?.display_name || "—"}`}
          </span>
        </>
      ),
      onClick: () => {
        void setFilter("status", "running");
      },
    });
  }

  // Chip 2: Long Running Warning
  if (longRunningDeployment) {
    const elapsed = Math.max(
      0,
      Math.floor(
        (tick - new Date(longRunningDeployment.deployment.started_at!).getTime()) / 1000
      )
    );
    const elapsedStr = formatElapsed(longRunningDeployment.deployment.started_at);

    chips.push({
      id: "long-running",
      content: (
        <>
          <Clock3 size={12} style={{ color: "#d97706" }} />
          <span style={{ fontWeight: 500, color: "#d97706" }}>
            {longRunningDeployment.deployment.repository.name} running {elapsedStr.replace(" ago", "")}
          </span>
        </>
      ),
      onClick: () => {
        void openDrawer(longRunningDeployment.deployment.id);
      },
      bgColor: "#fffbeb",
    });
  }

  // Chip 3: Last Good Deploy
  if (lastGoodDeploy) {
    const timeStr = lastGoodDeploy.created_at
      ? new Date(lastGoodDeploy.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

    chips.push({
      id: "last-good",
      content: (
        <>
          <CheckCircle2 size={12} color="var(--status-success-text)" />
          <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
            Last good:{" "}
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {lastGoodDeploy.commit_sha_short}
            </span>
            <span style={{ color: "var(--text-muted)" }}> · {timeStr}</span>
          </span>
        </>
      ),
      onClick: () => {
        void openDrawer(lastGoodDeploy.id);
      },
    });
  }

  // Chip 4: Failed Alert
  if (failedProdDeployments.length > 0) {
    const plural = failedProdDeployments.length === 1 ? "" : "s";
    chips.push({
      id: "failed",
      content: (
        <>
          <AlertTriangle size={12} color="var(--status-failed-text)" />
          <span style={{ fontWeight: 600, color: "var(--status-failed-text)" }}>
            {failedProdDeployments.length} prod failure{plural} today
          </span>
        </>
      ),
      onClick: () => {
        void setFilter("status", "failed");
        void setFilter("environment", "production");
      },
      bgColor: "rgba(239, 68, 68, 0.05)",
    });
  }

  // Chip 5: Top Deployers
  if (topDeployers.length > 0) {
    chips.push({
      id: "deployers",
      content: (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Today:</span>
          <div style={{ display: "flex", alignItems: "center", marginLeft: "2px" }}>
            {topDeployers.map((deployer, idx) => (
              <div
                key={deployer.triggered_by}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: getAvatarColor(deployer.triggered_by),
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 700,
                  marginLeft: idx > 0 ? "-6px" : "0",
                  border: "1px solid var(--bg-surface)",
                  zIndex: 3 - idx,
                }}
                title={deployer.triggered_by}
              >
                {deployer.triggered_by.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "4px" }}>
            {topDeployers[0].triggered_by}
          </span>
        </div>
      ),
      isLast: true,
    });
  }

  return (
    <div style={containerStyle}>
      {chips.map((chip, idx) => (
        <div
          key={chip.id}
          style={{
            ...(!chip.isLast && idx === chips.length - 1 ? lastChipStyle : chipStyle),
            backgroundColor: chip.bgColor,
            ...(!chip.bgColor && { ":hover": { backgroundColor: "var(--bg-hover)" } }),
          }}
          onClick={chip.onClick}
          onMouseEnter={(e) => {
            if (!chip.bgColor && chip.onClick) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!chip.bgColor) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
            }
          }}
        >
          {chip.content}
        </div>
      ))}
      {chips.length > 2 && onOpenPanel && (
        <button
          onClick={onOpenPanel}
          style={{
            height: "26px",
            padding: "0 10px",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginLeft: "auto",
            backgroundColor: "transparent",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-medium)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          View all insights
        </button>
      )}
    </div>
  );
}

function getAvatarColor(name: string): string {
  const first = name.charAt(0).toUpperCase();
  if (first >= "A" && first <= "F") return "#3b82f6"; // blue
  if (first >= "G" && first <= "L") return "#10b981"; // green
  if (first >= "M" && first <= "R") return "#f59e0b"; // amber
  return "#8b5cf6"; // purple
}
