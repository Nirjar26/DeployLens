import { ChevronRight, Clock } from "lucide-react";
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
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function EnvironmentColumn({ item, onOpen, onViewAll }: Props) {
  const rateColor =
    item.success_rate > 80 ? "#16a34a" : item.success_rate >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="dl-env-column">
      {/* Column Header */}
      <div className="dl-env-col-header">
        <div className="dl-env-col-title-row">
          <div className="dl-env-col-title">
            <span className="dl-env-dot-lg" style={{ background: item.environment.color_tag }} />
            <span>{item.environment.display_name}</span>
          </div>
          <span className="dl-env-col-today">{item.total_today} today</span>
        </div>
        <div className="dl-env-col-rate" style={{ color: rateColor }}>
          {item.success_rate}% success
        </div>
      </div>

      {/* Latest Deployment Card */}
      {item.latest_deployment ? (
        <div className="dl-env-latest-card">
          <StatusBadge status={item.latest_deployment.unified_status} size="sm" />
          <div className="dl-env-sha-box">{item.latest_deployment.commit_sha_short}</div>
          <p className="dl-env-commit-msg">
            {item.latest_deployment.commit_message ?? "No commit message"}
          </p>
          <div className="dl-env-card-footer">
            <span className="dl-env-trigger">{item.latest_deployment.triggered_by ?? "unknown"}</span>
            <span className="dl-env-time">{timeAgo(item.latest_deployment.created_at)}</span>
          </div>
          <button
            type="button"
            className="dl-env-view-btn"
            onClick={() => onOpen(item.latest_deployment!.id)}
          >
            View details
          </button>
        </div>
      ) : (
        <div className="dl-env-empty-card">
          <Clock size={24} className="dl-env-empty-icon" />
          <span>No deployments yet</span>
        </div>
      )}

      {/* Recent Deployments */}
      <div className="dl-env-recent-list">
        {(item.recent_deployments ?? []).slice(1, 5).map((deployment) => (
          <button
            type="button"
            key={deployment.id}
            className="dl-env-recent-item"
            onClick={() => onOpen(deployment.id)}
          >
            <StatusBadge status={deployment.unified_status} size="xs" />
            <span className="dl-env-recent-info">
              <span className="dl-env-recent-sha">{deployment.commit_sha_short}</span>
              <span className="dl-env-recent-time">{timeAgo(deployment.created_at)}</span>
            </span>
            <ChevronRight size={12} className="dl-env-recent-chevron" />
          </button>
        ))}
      </div>

      {/* Footer link */}
      <button type="button" className="dl-env-footer-link" onClick={() => onViewAll(item.environment.display_name)}>
        View all in {item.environment.display_name} →
      </button>
    </div>
  );
}
