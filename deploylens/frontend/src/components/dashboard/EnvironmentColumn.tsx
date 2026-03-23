import { DeploymentRow } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";

type Props = {
  item: {
    environment: {
      id: string;
      display_name: string;
      color_tag: string;
    };
    latest_deployment: DeploymentRow | null;
    recent_deployments?: DeploymentRow[];
    total_today: number;
    success_rate: number;
  };
  onOpen: (id: string) => void;
  onViewAll: (environmentName: string) => void;
};

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function EnvironmentColumn({ item, onOpen, onViewAll }: Props) {
  const rateClass = item.success_rate > 80 ? "stat-good" : item.success_rate >= 50 ? "stat-warn" : "stat-bad";

  return (
    <div className="env-column">
      <header className="env-column-head">
        <div><span className="env-dot" style={{ background: item.environment.color_tag }} /> {item.environment.display_name}</div>
        <small>{item.total_today} today</small>
        <small className={rateClass}>{item.success_rate}% success</small>
      </header>

      {item.latest_deployment ? (
        <button type="button" className="latest-card" onClick={() => onOpen(item.latest_deployment!.id)}>
          <StatusBadge status={item.latest_deployment.unified_status} size="sm" />
          <div className="sha-pill">{item.latest_deployment.commit_sha_short}</div>
          <p>{item.latest_deployment.commit_message ?? "No message"}</p>
          <small>{item.latest_deployment.triggered_by ?? "unknown"} · {timeAgo(item.latest_deployment.created_at)}</small>
          <span className="link-button">View details</span>
        </button>
      ) : (
        <div className="latest-card empty">No deployments yet</div>
      )}

      <div className="recent-list">
        {(item.recent_deployments ?? []).slice(1, 5).map((deployment) => (
          <button type="button" key={deployment.id} className="recent-item" onClick={() => onOpen(deployment.id)}>
            <StatusBadge status={deployment.unified_status} size="sm" />
            <span className="sha-pill">{deployment.commit_sha_short}</span>
            <small>{timeAgo(deployment.created_at)}</small>
          </button>
        ))}
      </div>

      <button type="button" className="link-button" onClick={() => onViewAll(item.environment.display_name)}>
        View all in {item.environment.display_name} →
      </button>
    </div>
  );
}
