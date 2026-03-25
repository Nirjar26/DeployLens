import { CSSProperties } from "react";
import { DeploymentStats } from "../../store/deploymentStore";

type Props = {
  stats: DeploymentStats | null;
};

export default function TopDeployers({ stats }: Props) {
  const items = (stats?.top_deployers ?? []).filter((item) => item.triggered_by).slice(0, 4);
  const overflow = Math.max(0, (stats?.top_deployers?.length ?? 0) - items.length);

  if (items.length === 0) {
    return null;
  }

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    marginBottom: "12px",
    flexWrap: "wrap",
  };

  const labelStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  };

  const listStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  };

  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  };

  const avatarStyle: CSSProperties = {
    width: "24px",
    height: "24px",
    borderRadius: "var(--radius-full)",
    background: "var(--accent-light)",
    border: "2px solid var(--bg-surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--accent)",
  };

  const usernameStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    maxWidth: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const countStyle: CSSProperties = {
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-full)",
    padding: "0 6px",
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted)",
  };

  const moreStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
    fontWeight: 600,
  };

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Top deployers (7d):</span>
      <div style={listStyle}>
        {items.map((item) => (
          <div key={item.triggered_by} style={itemStyle} title={`@${item.triggered_by} - ${item.count} deployments`}>
            <span style={avatarStyle}>{item.triggered_by.charAt(0).toUpperCase()}</span>
            <span style={usernameStyle}>{item.triggered_by}</span>
            <span style={countStyle}>{item.count}</span>
          </div>
        ))}
        {overflow > 0 ? <span style={moreStyle}>+{overflow} more</span> : null}
      </div>
    </div>
  );
}
