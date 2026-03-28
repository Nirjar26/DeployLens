import { ChevronRight, GitBranch } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { DeploymentRow as DeploymentRowType } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";

type Props = {
  deployment: DeploymentRowType;
  onOpen: (id: string) => void;
  compareMode: boolean;
  isSelectedForCompare: boolean;
  onToggleCompareSelection: (id: string) => void;
  density?: "compact" | "default" | "comfortable";
  rowIndex: number;
  isLastRow: boolean;
  isActive: boolean;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatStaticDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function formatRunningElapsed(seconds: number): string {
  const safe = Math.max(0, seconds);

  if (safe < 60) return `${safe}s`;
  if (safe < 3600) {
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return `${minutes}m ${remainder}s`;
  }

  if (safe < 86400) {
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  return `${days}d ${hours}h`;
}

function getActorTone(actor: string | null): { bg: string; fg: string; isBot: boolean } {
  if (!actor) {
    return {
      bg: "var(--bg-sunken)",
      fg: "var(--text-muted)",
      isBot: false,
    };
  }

  const isBot = actor.toLowerCase().includes("[bot]");
  if (isBot) {
    return {
      bg: "var(--bg-sunken)",
      fg: "var(--text-muted)",
      isBot: true,
    };
  }

  const first = actor.charAt(0).toUpperCase();
  if (first >= "A" && first <= "F") {
    return {
      bg: "var(--status-offhours-bg)",
      fg: "var(--status-offhours-text)",
      isBot: false,
    };
  }
  if (first >= "G" && first <= "L") {
    return {
      bg: "var(--status-running-bg)",
      fg: "var(--status-running-text)",
      isBot: false,
    };
  }
  if (first >= "M" && first <= "R") {
    return {
      bg: "var(--status-success-bg)",
      fg: "var(--status-success-text)",
      isBot: false,
    };
  }

  return {
    bg: "var(--status-warning-bg)",
    fg: "var(--status-warning-text)",
    isBot: false,
  };
}

export default function DeploymentRow({
  deployment,
  onOpen,
  compareMode,
  isSelectedForCompare,
  onToggleCompareSelection,
  density = "default",
  rowIndex,
  isLastRow,
  isActive,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [isHovered, setIsHovered] = useState(false);
  const [isViewHovered, setIsViewHovered] = useState(false);

  const isRunning = deployment.unified_status === "running";
  const shouldTick = isRunning && Boolean(deployment.started_at);

  useEffect(() => {
    if (!shouldTick) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [shouldTick]);

  const whenDuration = useMemo(() => {
    if (isRunning && deployment.started_at) {
      const elapsed = Math.max(0, Math.floor((now - new Date(deployment.started_at).getTime()) / 1000));
      return formatRunningElapsed(elapsed);
    }

    return formatStaticDuration(deployment.duration_seconds);
  }, [deployment.duration_seconds, deployment.started_at, isRunning, now]);

  const branchBadges = useMemo(() => {
    const next: Array<{ label: "HOTFIX" | "ROLLBACK"; tone: "failed" | "rolledback" }> = [];
    const branch = deployment.branch.toLowerCase();

    if (branch.includes("hotfix") || branch.includes("fix") || branch.includes("patch")) {
      next.push({ label: "HOTFIX", tone: "failed" });
    }

    if (deployment.is_rollback) {
      next.push({ label: "ROLLBACK", tone: "rolledback" });
    }

    return next;
  }, [deployment.branch, deployment.is_rollback]);

  const actorTone = getActorTone(deployment.triggered_by);
  const actorInitial = actorTone.isBot ? "B" : deployment.triggered_by?.charAt(0).toUpperCase() ?? "?";

  const rowMinHeight = density === "compact" ? 56 : density === "comfortable" ? 72 : 64;
  const oddRowBackground =
    rowIndex % 2 === 1
      ? "color-mix(in srgb, var(--bg-sunken) 50%, var(--bg-surface) 50%)"
      : "transparent";

  const rowStyle: CSSProperties = {
    minHeight: `${rowMinHeight}px`,
    cursor: "pointer",
    backgroundColor: isHovered ? "var(--bg-hover)" : isActive ? "var(--accent-light)" : oddRowBackground,
    transition: "background var(--transition-fast)",
    boxShadow: isActive ? "inset 2px 0 0 var(--accent)" : undefined,
  };

  const cellBaseStyle: CSSProperties = {
    padding: "12px 16px",
    verticalAlign: "middle",
    textAlign: "center",
    borderBottom: isLastRow ? "none" : "1px solid var(--bg-sunken)",
  };

  const branchRowStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    minWidth: 0,
  };

  const branchNameStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const shaPillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    height: "18px",
    padding: "1px 6px",
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-light)",
    borderRadius: "4px",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
    letterSpacing: "0.3px",
  };

  const contextBadgeStyle = (tone: "failed" | "rolledback"): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    height: "16px",
    borderRadius: "3px",
    padding: "1px 5px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    border:
      tone === "failed"
        ? "1px solid var(--status-failed-border)"
        : "1px solid var(--status-rolledback-border)",
    background: tone === "failed" ? "var(--status-failed-bg)" : "var(--status-rolledback-bg)",
    color: tone === "failed" ? "var(--status-failed-text)" : "var(--status-rolledback-text)",
  });

  const envChipStyle = (colorTag: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "22px",
    padding: "0 8px",
    borderRadius: "var(--radius-full)",
    border: `1px solid color-mix(in srgb, ${colorTag} 20%, var(--bg-surface) 80%)`,
    background: `color-mix(in srgb, ${colorTag} 10%, var(--bg-surface) 90%)`,
    color: "var(--text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    maxWidth: "120px",
  });

  const viewButtonActive = isViewHovered || isHovered || isActive;

  const viewButtonStyle: CSSProperties = {
    height: "28px",
    padding: "0 12px",
    border: `1px solid ${viewButtonActive ? "var(--accent-border)" : "var(--border-light)"}`,
    borderRadius: "var(--radius-md)",
    background: viewButtonActive ? "var(--accent-light)" : "var(--bg-surface)",
    fontSize: "11px",
    fontWeight: 600,
    color: viewButtonActive ? "var(--accent)" : "var(--text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    transition: "all var(--transition-base)",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };

  const viewIconStyle: CSSProperties = {
    opacity: viewButtonActive ? 1 : 0,
    transform: viewButtonActive ? "translateX(0)" : "translateX(-3px)",
    transition: "all var(--transition-base)",
  };

  return (
    <tr
      className="dl-table-row"
      onClick={() => onOpen(deployment.id)}
      style={rowStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsViewHovered(false);
      }}
    >
      {compareMode ? (
        <td style={cellBaseStyle}>
          <input
            type="checkbox"
            checked={isSelectedForCompare}
            onChange={() => onToggleCompareSelection(deployment.id)}
            onClick={(event) => event.stopPropagation()}
          />
        </td>
      ) : null}

      <td style={{ ...cellBaseStyle, textAlign: "center" }}>
        <StatusBadge status={deployment.unified_status} />
      </td>

      <td style={cellBaseStyle}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            maxWidth: "120px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: "0 auto",
          }}
        >
          {deployment.repository.name || "—"}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            maxWidth: "120px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: "2px",
            marginInline: "auto",
          }}
        >
          {deployment.repository.owner || "—"}
        </div>
      </td>

      <td style={cellBaseStyle}>
        <div style={{ display: "grid", gap: "2px", minWidth: 0, justifyItems: "center" }}>
          <div style={{ ...branchRowStyle, justifyContent: "center", width: "100%" }}>
            <GitBranch size={11} color="var(--accent)" />
            <span style={{ ...branchNameStyle, maxWidth: "136px", textAlign: "center" }}>{deployment.branch || "—"}</span>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", flexWrap: "wrap", maxWidth: "100%" }}>
            <span style={shaPillStyle}>{deployment.commit_sha_short || "—"}</span>
            {branchBadges.map((badge) => (
              <span key={badge.label} style={contextBadgeStyle(badge.tone)}>
                {badge.label}
              </span>
            ))}
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              maxWidth: "136px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
              marginTop: "1px",
              textAlign: "center",
            }}
            title={deployment.commit_message ?? "—"}
          >
            {deployment.commit_message || "—"}
          </div>
        </div>
      </td>

      <td style={cellBaseStyle}>
        {deployment.environment ? (
          <span style={{ ...envChipStyle(deployment.environment.color_tag), margin: "0 auto" }} title={deployment.environment.display_name}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: deployment.environment.color_tag,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {deployment.environment.display_name}
            </span>
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>—</span>
        )}
      </td>

      <td style={cellBaseStyle}>
        {deployment.triggered_by ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", minWidth: 0 }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: actorTone.isBot ? "8px" : "10px",
                fontWeight: 700,
                flexShrink: 0,
                background: actorTone.bg,
                color: actorTone.fg,
              }}
            >
              {actorInitial}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                maxWidth: "92px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={deployment.triggered_by}
            >
              {deployment.triggered_by}
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>—</span>
        )}
      </td>

      <td style={{ ...cellBaseStyle, textAlign: "center" }} title={new Date(deployment.created_at).toLocaleString()}>
        <div style={{ display: "grid", gap: "2px", justifyItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {formatRelative(deployment.created_at)}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: isRunning ? "var(--status-running-text)" : "var(--text-muted)",
              lineHeight: 1.2,
              fontFamily: "var(--font-mono)",
            }}
          >
            {whenDuration}
          </span>
          {isRunning ? (
            <span
              style={{
                fontSize: "10px",
                lineHeight: 1.1,
                color: "color-mix(in srgb, var(--status-running-text) 60%, var(--bg-surface) 40%)",
              }}
            >
              running
            </span>
          ) : null}
        </div>
      </td>

      <td style={cellBaseStyle}>
        <button
          type="button"
          style={{ ...viewButtonStyle, margin: "0 auto" }}
          onMouseEnter={() => setIsViewHovered(true)}
          onMouseLeave={() => setIsViewHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(deployment.id);
          }}
        >
          View
          <ChevronRight size={10} style={viewIconStyle} />
        </button>
      </td>
    </tr>
  );
}
