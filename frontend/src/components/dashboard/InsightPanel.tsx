import { CSSProperties, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, X, ChevronRight } from "lucide-react";
import { useDeploymentStore } from "../../store/deploymentStore";
import { formatElapsed, formatDuration } from "../../lib/formatters";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenDeployment: (id: string) => void;
};

export default function InsightPanel({ open, onClose, onOpenDeployment }: Props) {
  const deployments = useDeploymentStore((state) => state.deployments);
  const stats = useDeploymentStore((state) => state.stats);
  const [tick, setTick] = useState(Date.now());

  // Update timer every second
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  // Get running deployments
  const running = useMemo(
    () => deployments.filter((d) => d.unified_status === "running"),
    [deployments]
  );

  // Get long running warnings
  const avgSeconds = stats?.avg_duration_7d ?? 0;
  const longRunning = useMemo(() => {
    if (avgSeconds <= 0) return [];
    return deployments
      .filter((d) => d.unified_status === "running" && d.started_at)
      .filter((d) => {
        const elapsed = Math.max(0, Math.floor((tick - new Date(d.started_at!).getTime()) / 1000));
        return elapsed > avgSeconds * 2;
      });
  }, [deployments, avgSeconds, tick]);

  // Get recent failures in prod (last 24h)
  const recentFailures = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return deployments
      .filter((d) => {
        const isFailedRecently =
          d.unified_status === "failed" &&
          d.created_at &&
          new Date(d.created_at) > twentyFourHoursAgo;

        const isProd =
          d.environment?.color_tag === "#ef4444" ||
          (d.environment?.display_name &&
            d.environment.display_name.toLowerCase().includes("prod"));

        return isFailedRecently && isProd;
      })
      .slice(0, 10);
  }, [deployments]);

  // Get last good deploy per environment
  const lastGoodPerEnv = useMemo(() => {
    const envMap = new Map<string, any>();
    deployments.forEach((d) => {
      const envId = d.environment?.id;
      if (d.unified_status === "success" && envId && !envMap.has(envId)) {
        envMap.set(envId, d);
      }
    });
    return Array.from(envMap.values());
  }, [deployments]);

  // Top deployers
  const topDeployers = useMemo(() => {
    return (stats?.top_deployers ?? []).slice(0, 5);
  }, [stats]);

  const panelStyle: CSSProperties = {
    position: "fixed",
    right: 0,
    top: 0,
    width: "360px",
    height: "100vh",
    backgroundColor: "var(--bg-surface)",
    borderLeft: "1px solid var(--border-light)",
    boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    animation: open ? "slideIn 200ms ease-out" : "slideOut 200ms ease-in",
    transform: open ? "translateX(0)" : "translateX(100%)",
    transition: open ? undefined : "transform 200ms ease-in",
  };

  const headerStyle: CSSProperties = {
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
  };

  const sectionStyle: CSSProperties = {
    marginBottom: "20px",
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--text-muted)",
    marginBottom: "8px",
  };

  const rowStyle: CSSProperties = {
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "background var(--transition-fast)",
    fontSize: "13px",
    lineHeight: "1.5",
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          zIndex: 999,
          animation: open ? "fadeIn 200ms ease-out" : "fadeOut 200ms ease-in",
          opacity: open ? 1 : 0,
          transition: open ? undefined : "opacity 200ms ease-in",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={panelStyle}>
        <header style={headerStyle}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Deployment Insights
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div style={bodyStyle}>
          {/* Active Deployments Section */}
          {running.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Active Deployments</h3>
              {running.map((d) => (
                <div
                  key={d.id}
                  style={rowStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    onOpenDeployment(d.id);
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "var(--status-running-text)",
                        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }}
                    />
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {d.repository.name} → {d.environment?.display_name || "—"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>
                      {formatElapsed(d.started_at).replace(" ago", "")}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Warnings Section */}
          {longRunning.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Warnings</h3>
              {longRunning.map((d) => (
                <div
                  key={d.id}
                  style={{
                    ...rowStyle,
                    backgroundColor: "rgba(217, 119, 6, 0.05)",
                    borderLeft: "2px solid #d97706",
                    paddingLeft: "8px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(217, 119, 6, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(217, 119, 6, 0.05)";
                  }}
                  onClick={() => {
                    onOpenDeployment(d.id);
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock3 size={12} color="#d97706" />
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {d.repository.name} has been running{" "}
                      <span style={{ color: "#d97706", fontWeight: 600 }}>
                        {formatElapsed(d.started_at).replace(" ago", "")}
                      </span>
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Typical: {formatDuration(avgSeconds)}. This may indicate an issue.
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Recent Failures Section */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Recent Failures (24h)</h3>
            {recentFailures.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px",
                  backgroundColor: "var(--bg-sunken)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                <CheckCircle2 size={13} color="var(--status-success-text)" />
                No production failures in the last 24 hours
              </div>
            ) : (
              recentFailures.map((d) => (
                <div
                  key={d.id}
                  style={{
                    ...rowStyle,
                    backgroundColor: "rgba(239, 68, 68, 0.05)",
                    borderLeft: "2px solid #ef4444",
                    paddingLeft: "8px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(239, 68, 68, 0.05)";
                  }}
                  onClick={() => {
                    onOpenDeployment(d.id);
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {d.repository.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Last Good Deploys Section */}
          {lastGoodPerEnv.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Last Good Deploys</h3>
              {lastGoodPerEnv.map((d) => (
                <div
                  key={d.id}
                  style={rowStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    onOpenDeployment(d.id);
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={12} color="var(--status-success-text)" />
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {d.environment?.display_name || "Unknown"}: {d.repository.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {d.commit_sha_short} · {new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Top Deployers Section */}
          {topDeployers.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Top Deployers (7 days)</h3>
              {topDeployers.map((deployer, idx) => (
                <div
                  key={deployer.triggered_by}
                  style={{
                    ...rowStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    backgroundColor: "transparent",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", width: "20px" }}>
                    #{idx + 1}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: getAvatarColor(deployer.triggered_by),
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {deployer.triggered_by.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {deployer.triggered_by}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {deployer.count} deployment{deployer.count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function getAvatarColor(name: string): string {
  const first = name.charAt(0).toUpperCase();
  if (first >= "A" && first <= "F") return "#3b82f6"; // blue
  if (first >= "G" && first <= "L") return "#10b981"; // green
  if (first >= "M" && first <= "R") return "#f59e0b"; // amber
  return "#8b5cf6"; // purple
}
