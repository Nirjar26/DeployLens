import { CSSProperties, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useDeploymentStore } from "../../store/deploymentStore";

export default function FailedDeploymentAlert() {
  const deployments = useDeploymentStore((state) => state.deployments);
  const setFilter = useDeploymentStore((state) => state.setFilter);
  const [isDismissed, setIsDismissed] = useState(false);

  // Find failed prod deployments in last 24 hours
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

  if (isDismissed || failedProdDeployments.length === 0) {
    return null;
  }

  const alertStyle: CSSProperties = {
    background: "var(--status-failed-bg)",
    border: "1px solid var(--status-failed-border)",
    borderLeft: "3px solid var(--status-failed-text)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const leftIconStyle: CSSProperties = {
    flexShrink: 0,
  };

  const centerStyle: CSSProperties = {
    flex: 1,
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--status-failed-text)",
  };

  const buttonsStyle: CSSProperties = {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  };

  const showButtonStyle: CSSProperties = {
    height: "26px",
    padding: "0 10px",
    background: "var(--status-failed-text)",
    color: "var(--text-on-accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const dismissButtonStyle: CSSProperties = {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    color: "var(--status-failed-text)",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    transition: "all var(--transition-fast)",
    padding: 0,
  };

  return (
    <div style={alertStyle}>
      <div style={leftIconStyle}>
        <AlertTriangle size={16} color="var(--status-failed-text)" />
      </div>

      <div style={centerStyle}>
        {failedProdDeployments.length} production deployment
        {failedProdDeployments.length !== 1 ? "s" : ""} failed in the last 24 hours
      </div>

      <div style={buttonsStyle}>
        <button
          style={showButtonStyle}
          onClick={() => {
            void setFilter("status", "failed");
            void setFilter("environment", "production");
          }}
        >
          Show failed
        </button>

        <button
          style={dismissButtonStyle}
          onClick={() => setIsDismissed(true)}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
