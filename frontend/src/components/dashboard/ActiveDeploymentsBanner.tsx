import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useDeploymentStore } from "../../store/deploymentStore";

export default function ActiveDeploymentsBanner() {
  const deployments = useDeploymentStore((state) => state.deployments);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);
  const setFilter = useDeploymentStore((state) => state.setFilter);

  // Get running deployments from store
  const runningDeployments = useMemo(
    () => deployments.filter((d) => d.unified_status === "running"),
    [deployments]
  );

  // Calculate relative time
  const [elapsedTime, setElapsedTime] = useState<Record<string, string>>({});

  useEffect(() => {
    if (runningDeployments.length === 0) return;

    const updateTimes = () => {
      const newTimes: Record<string, string> = {};
      runningDeployments.forEach((d) => {
        if (d.started_at) {
          const elapsed = Math.floor((Date.now() - new Date(d.started_at).getTime()) / 1000);
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          newTimes[d.id] = `${mins}m ${secs}s`;
        }
      });
      setElapsedTime(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [runningDeployments]);

  if (runningDeployments.length === 0) {
    return null;
  }

  const bannerStyle: CSSProperties = {
    background: "var(--status-running-bg)",
    border: "1px solid var(--status-running-border)",
    borderRadius: "var(--radius-lg)",
    padding: "12px 18px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    animation: "slideDown 200ms ease",
  };

  const indicatorContainerStyle: CSSProperties = {
    position: "relative",
    width: "32px",
    height: "32px",
    flexShrink: 0,
  };

  const outerCircleStyle: CSSProperties = {
    position: "absolute",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "var(--status-running-text)",
    opacity: 0.2,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: "ripple 1.5s ease infinite",
  };

  const innerCircleStyle: CSSProperties = {
    position: "absolute",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--status-running-text)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const titleStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--status-running-text)",
  };

  const subtextStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--status-running-text)",
    opacity: 0.7,
  };

  const actionStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--status-running-text)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    textDecoration: "underline",
    transition: "opacity var(--transition-fast)",
  };

  const singleDeployment = runningDeployments[0];

  if (runningDeployments.length === 1 && singleDeployment) {
    return (
      <div style={bannerStyle}>
        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes ripple {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.4;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.5);
              opacity: 0;
            }
          }
        `}</style>

        <div style={indicatorContainerStyle}>
          <div style={outerCircleStyle} />
          <div style={innerCircleStyle} />
        </div>

        <div style={contentStyle}>
          <div style={titleStyle}>
            {singleDeployment.repository?.name || singleDeployment.repository?.full_name} is deploying to{" "}
            {singleDeployment.environment?.display_name || "unknown"}
          </div>
          <div style={subtextStyle}>
            Started {elapsedTime[singleDeployment.id] || "just now"} ago
          </div>
        </div>

        <button
          style={actionStyle}
          onClick={() => void openDrawer(singleDeployment.id)}
        >
          View details
        </button>
      </div>
    );
  }

  // Multiple deployments
  const listText = runningDeployments
    .slice(0, 3)
    .map(
      (d) =>
        `${d.repository?.name || d.repository?.full_name} → ${d.environment?.display_name || "unknown"}`
    )
    .join(", ");

  const hasMore = runningDeployments.length > 3;

  return (
    <div style={bannerStyle}>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
      `}</style>

      <div style={indicatorContainerStyle}>
        <div style={outerCircleStyle} />
        <div style={innerCircleStyle} />
      </div>

      <div style={contentStyle}>
        <div style={titleStyle}>
          {runningDeployments.length} deployment{runningDeployments.length !== 1 ? "s" : ""} in progress
        </div>
        <div style={subtextStyle}>
          {listText}
          {hasMore && "..."}
        </div>
      </div>

      <button
        style={actionStyle}
        onClick={() => void setFilter("status", "running")}
      >
        View all running
      </button>
    </div>
  );
}
