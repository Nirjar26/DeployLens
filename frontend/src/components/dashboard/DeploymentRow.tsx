import { GitBranch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DeploymentRow as DeploymentRowType } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";

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
};

export default function DeploymentRow({
  deployment,
  onOpen,
  compareMode,
  isSelectedForCompare,
  onToggleCompareSelection,
}: Props) {
  const [now, setNow] = useState(Date.now());

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

  return (
    <tr className="dl-table-row" onClick={() => onOpen(deployment.id)}>
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
