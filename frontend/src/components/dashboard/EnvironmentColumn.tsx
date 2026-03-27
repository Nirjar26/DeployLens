import { CSSProperties } from "react";
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
    item.success_rate > 80 ? "var(--status-success)" : item.success_rate >= 50 ? "var(--status-warning)" : "var(--status-failed)";

  const columnStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: "280px",
    flex: "0 0 280px",
  };

  const colHeaderStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const colTitleRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  };

  const colTitleStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const envDotLgStyle: CSSProperties = {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "var(--radius-full)",
    flex: "0 0 auto",
  };

  const colTodayStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-muted)",
    flex: "0 0 auto",
  };

  const colRateStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: rateColor,
  };

  const latestCardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
  };

  const shaBoxStyle: CSSProperties = {
    padding: "4px 8px",
    backgroundColor: "var(--accent-light)",
    color: "var(--accent)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    textAlign: "center",
  };

  const commitMsgStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const cardFooterStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    fontSize: "12px",
  };

  const triggerStyle: CSSProperties = {
    color: "var(--text-muted)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const timeStyle: CSSProperties = {
    color: "var(--text-muted)",
    fontStyle: "italic",
    flex: "0 0 auto",
  };

  const viewBtnStyle: CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "var(--bg-sunken)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    width: "100%",
  };

  const emptyCardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "32px 16px",
    backgroundColor: "var(--bg-sunken)",
    borderRadius: "var(--radius-lg)",
    border: "1px dashed var(--border-light)",
    color: "var(--text-muted)",
    textAlign: "center",
  };

  const emptyIconStyle: CSSProperties = {
    color: "var(--text-muted)",
  };

  const recentListStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const recentItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    minHeight: "32px",
  };

  const recentInfoStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  };

  const recentShaStyle: CSSProperties = {
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const recentTimeStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const recentChevronStyle: CSSProperties = {
    color: "var(--text-muted)",
    flex: "0 0 auto",
  };

  const footerLinkStyle: CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "transparent",
    color: "var(--accent)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const gradeMeta = (() => {
    const deployments = item.recent_deployments ?? [];
    if (deployments.length === 0) {
      return {
        grade: "—",
        color: "var(--text-muted)",
        background: "var(--bg-sunken)",
        border: "var(--border-light)",
        sample: 0,
      };
    }

    const successCount = deployments.filter((d) => d.unified_status === "success").length;
    const rate = (successCount / deployments.length) * 100;

    if (rate >= 90) {
      return {
        grade: "A",
        color: "var(--status-success-text)",
        background: "var(--status-success-bg)",
        border: "var(--status-success-border)",
        sample: deployments.length,
      };
    }

    if (rate >= 75) {
      return {
        grade: "B",
        color: "var(--status-success-text)",
        background: "var(--status-success-bg)",
        border: "var(--status-success-border)",
        sample: deployments.length,
      };
    }

    if (rate >= 50) {
      return {
        grade: "C",
        color: "var(--status-warning-text)",
        background: "var(--status-warning-bg)",
        border: "var(--status-warning-border)",
        sample: deployments.length,
      };
    }

    return {
      grade: "F",
      color: "var(--status-failed-text)",
      background: "var(--status-failed-bg)",
      border: "var(--status-failed-border)",
      sample: deployments.length,
    };
  })();

  return (
    <div style={columnStyle}>
      {/* Column Header */}
      <div style={colHeaderStyle}>
        <div style={colTitleRowStyle}>
          <div style={colTitleStyle}>
            <span style={{ ...envDotLgStyle, background: item.environment.color_tag }} />
            <span>{item.environment.display_name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              title={`Based on last ${gradeMeta.sample} deployments`}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 800,
                border: `1px solid ${gradeMeta.border}`,
                color: gradeMeta.color,
                background: gradeMeta.background,
              }}
            >
              {gradeMeta.grade}
            </span>
            <span style={colTodayStyle}>{item.total_today} today</span>
          </div>
        </div>
        <div style={colRateStyle}>
          {item.success_rate}% success
        </div>
      </div>

      {/* Latest Deployment Card */}
      {item.latest_deployment ? (
        <div style={latestCardStyle}>
          <StatusBadge status={item.latest_deployment.unified_status} size="sm" />
          <div style={shaBoxStyle}>{item.latest_deployment.commit_sha_short}</div>
          <p style={commitMsgStyle}>
            {item.latest_deployment.commit_message ?? "No commit message"}
          </p>
          <div style={cardFooterStyle}>
            <span style={triggerStyle}>{item.latest_deployment.triggered_by ?? "unknown"}</span>
            <span style={timeStyle}>{timeAgo(item.latest_deployment.created_at)}</span>
          </div>
          <button
            type="button"
            style={viewBtnStyle}
            onClick={() => onOpen(item.latest_deployment!.id)}
          >
            View details
          </button>
        </div>
      ) : (
        <div style={emptyCardStyle}>
          <Clock size={24} style={emptyIconStyle} />
          <span>No deployments yet</span>
        </div>
      )}

      {/* Recent Deployments */}
      <div style={recentListStyle}>
        {(item.recent_deployments ?? []).slice(1, 5).map((deployment) => (
          <button
            type="button"
            key={deployment.id}
            style={recentItemStyle}
            onClick={() => onOpen(deployment.id)}
          >
            <StatusBadge status={deployment.unified_status} size="xs" />
            <span style={recentInfoStyle}>
              <span style={recentShaStyle}>{deployment.commit_sha_short}</span>
              <span style={recentTimeStyle}>{timeAgo(deployment.created_at)}</span>
            </span>
            <ChevronRight size={12} style={recentChevronStyle} />
          </button>
        ))}
      </div>

      {/* Footer link */}
      <button type="button" style={footerLinkStyle} onClick={() => onViewAll(item.environment.display_name)}>
        View all in {item.environment.display_name} →
      </button>
    </div>
  );
}
