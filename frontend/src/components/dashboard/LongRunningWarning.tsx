import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { useDeploymentStore } from "../../store/deploymentStore";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function LongRunningWarning() {
  const deployments = useDeploymentStore((state) => state.deployments);
  const stats = useDeploymentStore((state) => state.stats);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const avgSeconds = stats?.avg_duration_7d ?? 0;

  const longRunning = useMemo(() => {
    if (avgSeconds <= 0) {
      return [];
    }

    return deployments
      .filter((d) => d.unified_status === "running" && d.started_at)
      .map((d) => {
        const elapsed = Math.max(0, Math.floor((tick - new Date(d.started_at as string).getTime()) / 1000));
        return { deployment: d, elapsed };
      })
      .filter((item) => item.elapsed > avgSeconds * 2);
  }, [deployments, avgSeconds, tick]);

  if (longRunning.length === 0) {
    return null;
  }

  const wrapperStyle: CSSProperties = {
    background: "var(--status-warning-bg)",
    border: "1px solid var(--status-warning-border)",
    borderLeft: "3px solid var(--status-warning-text)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    animation: "slideDown 200ms ease",
  };

  const textStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--status-warning-text)",
  };

  const subStyle: CSSProperties = {
    marginTop: "2px",
    fontSize: "11px",
    color: "var(--status-warning-text)",
    opacity: 0.75,
  };

  const linkStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--status-warning-text)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  };

  if (longRunning.length === 1) {
    const item = longRunning[0];
    return (
      <div style={wrapperStyle}>
        <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px);} to { opacity: 1; transform: translateY(0);} }`}</style>
        <Clock3 size={15} color="var(--status-warning-text)" />
        <div style={textStyle}>
          <div style={titleStyle}>
            {item.deployment.repository.name} to {item.deployment.environment?.display_name ?? "unknown"} has been running for {formatDuration(item.elapsed)}
          </div>
          <div style={subStyle}>Typical duration is {formatDuration(avgSeconds)}. This may indicate an issue.</div>
        </div>
        <button type="button" style={linkStyle} onClick={() => void openDrawer(item.deployment.id)}>View deployment</button>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px);} to { opacity: 1; transform: translateY(0);} }`}</style>
      <Clock3 size={15} color="var(--status-warning-text)" />
      <div style={textStyle}>
        <div style={titleStyle}>{longRunning.length} deployments are taking longer than usual</div>
        <div style={subStyle}>
          {longRunning.slice(0, 3).map((item) => `${item.deployment.repository.name} (${formatDuration(item.elapsed)})`).join(", ")}
        </div>
      </div>
    </div>
  );
}
