import { GitBranch } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { DeploymentRow as DeploymentRowType } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";
import { useDeploymentStore } from "../../store/deploymentStore";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type Props = {
  deployment: DeploymentRowType;
  onOpen: (id: string) => void;
  compareMode: boolean;
  isSelectedForCompare: boolean;
  onToggleCompareSelection: (id: string) => void;
  density?: "compact" | "default" | "comfortable";
};

export default function DeploymentRow({
  deployment,
  onOpen,
  compareMode,
  isSelectedForCompare,
  onToggleCompareSelection,
  density = "default",
}: Props) {
  const [now, setNow] = useState(Date.now());
  const avgDuration7d = useDeploymentStore((state) => state.stats?.avg_duration_7d ?? 0);

  const rowStyle: CSSProperties = {
    minHeight: density === "compact" ? "44px" : density === "comfortable" ? "76px" : "60px",
  };

  useEffect(() => {
    const isLive = deployment.duration_seconds === null && deployment.unified_status === "running" && deployment.started_at;
    if (!isLive) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deployment.duration_seconds, deployment.started_at, deployment.unified_status]);

  const liveDuration = useMemo(() => {
    if (deployment.duration_seconds !== null) return formatDuration(deployment.duration_seconds);
    if (deployment.unified_status !== "running" || !deployment.started_at) return "—";
    const sec = Math.max(0, Math.floor((now - new Date(deployment.started_at).getTime()) / 1000));
    return formatDuration(sec);
  }, [deployment.duration_seconds, deployment.started_at, deployment.unified_status, now]);

  const isRunning = deployment.unified_status === "running";
  const triggerInitial = deployment.triggered_by?.charAt(0).toUpperCase() ?? "?";

  const badges = useMemo(() => {
    const next: Array<{ label: string; tone: "failed" | "rolledback" | "offhours" | "warning" | "accent"; icon?: "moon" }> = [];
    const branch = deployment.branch.toLowerCase();

    if (branch.includes("hotfix") || branch.includes("fix")) {
      next.push({ label: "HOTFIX", tone: "failed" });
    }

    if (deployment.is_rollback) {
      next.push({ label: "ROLLBACK", tone: "rolledback" });
    }

    if (deployment.started_at) {
      const started = new Date(deployment.started_at);
      const hour = started.getHours();
      const day = started.getDay();
      const isWeekend = day === 0 || day === 6;
      const isOffHours = hour >= 18 || hour <= 7;
      if (isWeekend || isOffHours) {
        next.push({ label: "OFF-HOURS", tone: "offhours", icon: "moon" });
      }
    }

    if (typeof deployment.duration_seconds === "number" && avgDuration7d > 0 && deployment.duration_seconds > avgDuration7d * 2) {
      next.push({ label: "SLOW", tone: "warning" });
    }

    if (deployment.is_first_deploy) {
      next.push({ label: "FIRST", tone: "accent" });
    }

    return next;
  }, [deployment, avgDuration7d]);

  const badgeBaseStyle: CSSProperties = {
    height: "16px",
    padding: "0 5px",
    borderRadius: "var(--radius-full)",
    fontSize: "9px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    gap: "3px",
  };

  const badgeToneStyle = (tone: "failed" | "rolledback" | "offhours" | "warning" | "accent"): CSSProperties => {
    switch (tone) {
      case "failed":
        return {
          background: "var(--status-failed-bg)",
          color: "var(--status-failed-text)",
          border: "1px solid var(--status-failed-border)",
        };
      case "rolledback":
        return {
          background: "var(--status-rolledback-bg)",
          color: "var(--status-rolledback-text)",
          border: "1px solid var(--status-rolledback-border)",
        };
      case "offhours":
        return {
          background: "var(--status-offhours-bg)",
          color: "var(--status-offhours-text)",
          border: "1px solid var(--status-offhours-border)",
        };
      case "warning":
        return {
          background: "var(--status-warning-bg)",
          color: "var(--status-warning-text)",
          border: "1px solid var(--status-warning-border)",
        };
      default:
        return {
          background: "var(--accent-light)",
          color: "var(--accent)",
          border: "1px solid var(--accent-border)",
        };
    }
  };

  return (
    <tr className="dl-table-row" onClick={() => onOpen(deployment.id)} style={rowStyle}>
      {compareMode ? (
        <td>
          <input
            type="checkbox"
            checked={isSelectedForCompare}
            onChange={() => onToggleCompareSelection(deployment.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      ) : null}
      <td className="dl-cell-status">
        <StatusBadge status={deployment.unified_status} />
      </td>
      <td>
        <div className="dl-cell-repo-name">{deployment.repository.name}</div>
        <div className="dl-cell-repo-owner">{deployment.repository.owner}</div>
      </td>
      <td>
        <div className="dl-cell-branch">
          <GitBranch size={12} className="dl-branch-icon-inline" />
          <span>{deployment.branch}</span>
        </div>
        <span className="dl-sha-pill">{deployment.commit_sha_short}</span>
        <div className="dl-cell-message">{deployment.commit_message ?? "—"}</div>
        {badges.length > 0 ? (
          <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
            {badges.map((badge) => (
              <span key={badge.label} style={{ ...badgeBaseStyle, ...badgeToneStyle(badge.tone) }}>
                {badge.icon === "moon" ? (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="M6.4 1.2A3.8 3.8 0 1 0 8.8 6.9 4 4 0 1 1 6.4 1.2Z" fill="currentColor" />
                  </svg>
                ) : null}
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td>
        {deployment.environment ? (
          <span className="dl-env-pill">
            <span className="dl-env-dot" style={{ background: deployment.environment.color_tag }} />
            {deployment.environment.display_name}
          </span>
        ) : (
          <span className="dl-muted-dash">—</span>
        )}
      </td>
      <td>
        {deployment.triggered_by ? (
          <div className="dl-trigger-cell">
            <span className="dl-trigger-avatar">{triggerInitial}</span>
            <span className="dl-trigger-name">{deployment.triggered_by}</span>
          </div>
        ) : (
          <span className="dl-muted-dash">—</span>
        )}
      </td>
      <td>
        <span className={`dl-cell-duration ${isRunning ? "dl-cell-duration-live" : ""}`}>
          {liveDuration}
        </span>
      </td>
      <td title={new Date(deployment.created_at).toLocaleString()}>
        <span className="dl-cell-time">{formatRelative(deployment.created_at)}</span>
      </td>
      <td>
        <button
          type="button"
          className="dl-view-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(deployment.id);
          }}
        >
          View
        </button>
      </td>
    </tr>
  );
}
