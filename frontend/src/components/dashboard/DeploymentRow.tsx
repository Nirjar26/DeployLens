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
};

export default function DeploymentRow({ deployment, onOpen }: Props) {
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

  return (
    <tr className="deployment-row" onClick={() => onOpen(deployment.id)}>
      <td><StatusBadge status={deployment.unified_status} /></td>
      <td>
        <div className="repo-main-text">{deployment.repository.name}</div>
        <div className="repo-sub-text">{deployment.repository.owner}</div>
      </td>
      <td>
        <div className="branch-row"><GitBranch size={13} /> {deployment.branch}</div>
        <div className="sha-pill">{deployment.commit_sha_short}</div>
        <div className="message-trunc">{deployment.commit_message ?? "—"}</div>
      </td>
      <td>
        {deployment.environment ? (
          <span className="env-pill"><span className="env-dot" style={{ background: deployment.environment.color_tag }} />{deployment.environment.display_name}</span>
        ) : "—"}
      </td>
      <td>{deployment.triggered_by ?? "—"}</td>
      <td>{liveDuration}</td>
      <td title={new Date(deployment.created_at).toLocaleString()}>{formatRelative(deployment.created_at)}</td>
      <td>
        <button
          type="button"
          className="link-button"
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
