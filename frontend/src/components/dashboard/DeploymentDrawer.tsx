import { ExternalLink, X, CheckCircle2, AlertTriangle, Clock3, Loader2, SkipForward, Zap, Info } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { deployments, github } from "../../lib/api";
import { unwatchDeployment, watchDeployment } from "../../lib/socket";
import { useAwsStore } from "../../store/awsStore";
import { DeploymentDetail } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";
import { formatDuration, formatElapsed } from "../../lib/formatters";

type Props = {
  open: boolean;
  detail: DeploymentDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onOpenLinkedDeployment: (id: string) => void;
};

const eventOrder = ["ApplicationStop", "BeforeInstall", "AfterInstall", "ApplicationStart", "ValidateService"];

export default function DeploymentDrawer({ open, detail, isLoading, onClose, onOpenLinkedDeployment }: Props) {
  const [now, setNow] = useState(Date.now());
  const [rollbackToast, setRollbackToast] = useState<string | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [promoteTargetId, setPromoteTargetId] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const environments = useAwsStore((state) => state.environments);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !detail || detail.duration_seconds !== null || detail.unified_status !== "running" || !detail.started_at) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [detail, open]);

  useEffect(() => {
    if (!open) {
      setRollbackToast(null);
      setActionError(null);
      setActionSuccess(null);
      setPromoteTargetId("");
    }
  }, [open]);

  useEffect(() => {
    const deploymentId = open ? detail?.id : null;
    if (!deploymentId) {
      return;
    }

    watchDeployment(deploymentId);
    return () => {
      unwatchDeployment(deploymentId);
    };
  }, [open, detail?.id]);

  const lifecycleEvents = useMemo(() => {
    if (!detail) return [];

    const codedeploy = detail.events.filter((e) => e.source === "codedeploy");
    return codedeploy.sort((a, b) => {
      const aIndex = eventOrder.indexOf(a.event_name);
      const bIndex = eventOrder.indexOf(b.event_name);
      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;
      return safeA - safeB;
    });
  }, [detail]);

  const promoteOptions = useMemo(() => {
    if (!detail?.repository?.id) {
      return [];
    }

    return environments.filter((env) => env.repository_id === detail.repository.id && env.id !== detail.environment?.id);
  }, [detail?.environment?.id, detail?.repository?.id, environments]);

  async function handleRerun() {
    if (!detail?.github_run_id) return;
    setRerunLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await github.rerunWorkflow(detail.github_run_id);
      setActionSuccess("Workflow re-run has been triggered.");
    } catch (error) {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === "RUN_NOT_FAILED") {
        setActionError("Only failed workflow runs can be re-run.");
      } else if (code === "GITHUB_FORBIDDEN") {
        setActionError("GitHub workflow write permission is missing.");
      } else {
        setActionError("Failed to trigger re-run.");
      }
    } finally {
      setRerunLoading(false);
    }
  }

  async function handlePromote() {
    if (!detail || !promoteTargetId) return;
    setPromoteLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await deployments.promote(detail.id, promoteTargetId);
      setActionSuccess(result.message || "Promotion started.");
      if (result.new_deployment_id) {
        onOpenLinkedDeployment(result.new_deployment_id);
      }
    } catch (error) {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === "NOT_PROMOTABLE") {
        setActionError("Only successful deployments can be promoted.");
      } else if (code === "TARGET_ENV_REPO_MISMATCH") {
        setActionError("Target environment must belong to the same repository.");
      } else if (code === "AWS_PROMOTION_FAILED") {
        setActionError("AWS rejected this promotion. Verify CodeDeploy permissions.");
      } else {
        setActionError("Failed to promote deployment.");
      }
    } finally {
      setPromoteLoading(false);
    }
  }

  if (!open) return null;

  const headerRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "16px 20px 12px 20px",
    borderBottom: "1px solid var(--border-light)",
    backgroundColor: "var(--bg-sunken)",
  };

  const headerContentStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "10px",
  };

  const shaPillStyle: CSSProperties = {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "4px 10px",
    backgroundColor: "var(--bg-hover)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-muted)",
    width: "fit-content",
  };

  const commitMessageStyle: CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginTop: "4px",
    lineHeight: 1.3,
  };

  const envStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "2px",
  };

  const closeButtonStyle: CSSProperties = {
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
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="deployment-drawer" onClick={(e) => e.stopPropagation()}>
        <div style={headerRowStyle}>
          {/* Left: Status Badge */}
          <StatusBadge status={detail?.unified_status ?? "pending"} size="lg" />
          {/* Right: Close Button */}
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SHA + Commit Message below */}
        {detail && (
          <div style={headerContentStyle}>
            <div style={shaPillStyle}>{detail.commit_sha_short}</div>
            <h3 style={commitMessageStyle}>{detail.commit_message ?? "No commit message"}</h3>
            <div style={envStyle}>
              {detail.environment ? `in ${detail.environment.display_name}` : "Unassigned environment"}
            </div>
          </div>
        )}

        {isLoading || !detail ? (
          <div className="drawer-body"><div className="repo-skeleton" /><div className="repo-skeleton" /><div className="repo-skeleton" /></div>
        ) : (
          <div className="drawer-body">
            <section className="drawer-section">
              <h4>Overview</h4>
              <div className="overview-grid">
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Repository</div>
                  <a href={`https://github.com/${detail.repository.full_name}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 500, fontSize: "13px", textDecoration: "none" }}>
                    {detail.repository.full_name}
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Branch</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-primary)" }}>{detail.branch}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Triggered by</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-primary)" }}>{detail.triggered_by ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Started</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-primary)" }}>
                    {detail.started_at ? new Date(detail.started_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Finished</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-primary)" }}>
                    {detail.finished_at ? new Date(detail.finished_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>
                    {detail.unified_status === "running" ? "Running for" : "Duration"}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: detail.unified_status === "running" ? "var(--status-running-text)" : "var(--text-primary)" }}>
                    {detail.unified_status === "running" && detail.started_at
                      ? formatElapsed(detail.started_at).replace(" ago", "")
                      : detail.duration_seconds !== null
                        ? formatDuration(detail.duration_seconds)
                        : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "3px" }}>Is rollback</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-primary)" }}>
                    {detail.is_rollback ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </section>

            {detail.github_run_url ? (
              <section className="drawer-section">
                <h4>GitHub Actions</h4>
                <a
                  href={detail.github_run_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--accent)",
                    textDecoration: "none",
                    marginBottom: "10px",
                  }}
                >
                  View run on GitHub
                  <ExternalLink size={11} />
                </a>

                {detail.events.filter((e) => e.source === "github").length === 0 ? (
                  <div
                    style={{
                      backgroundColor: "var(--bg-sunken)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Info size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No step data available
                    </span>
                  </div>
                ) : null}

                {detail.unified_status === "failed" && detail.github_run_id ? (
                  <button
                    type="button"
                    className="auth-btn auth-btn-secondary"
                    onClick={() => void handleRerun()}
                    disabled={rerunLoading}
                  >
                    {rerunLoading ? "Triggering..." : "Re-run workflow"}
                  </button>
                ) : null}
              </section>
            ) : null}

            {detail.codedeploy_id ? (
              <section className="drawer-section">
                <h4>CodeDeploy</h4>
                {lifecycleEvents.length === 0 ? (
                  <p>No step data available</p>
                ) : (
                  lifecycleEvents.map((event) => {
                    const getStatusIcon = (status: string) => {
                      switch (status.toLowerCase()) {
                        case "succeeded":
                          return <CheckCircle2 size={16} color="var(--status-success-text)" />;
                        case "failed":
                          return <AlertTriangle size={16} color="var(--status-failed-text)" />;
                        case "inprogress":
                          return <Loader2 size={16} color="var(--status-running-text)" style={{ animation: "spin 1s linear infinite" }} />;
                        case "pending":
                          return <Clock3 size={16} color="var(--text-muted)" />;
                        case "skipped":
                          return <SkipForward size={16} color="var(--border-medium)" />;
                        default:
                          return null;
                      }
                    };

                    const getStatusColor = (status: string) => {
                      switch (status.toLowerCase()) {
                        case "succeeded":
                          return "var(--status-success-text)";
                        case "failed":
                          return "var(--status-failed-text)";
                        case "inprogress":
                          return "var(--status-running-text)";
                        default:
                          return "var(--text-muted)";
                      }
                    };

                    const isFailed = event.status.toLowerCase() === "failed";

                    return (
                      <div
                        key={`${event.source}-${event.event_name}`}
                        style={{
                          height: "auto",
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--bg-sunken)",
                          gap: "10px",
                          backgroundColor: isFailed ? "rgba(239, 68, 68, 0.05)" : "transparent",
                        }}
                      >
                        <div style={{ marginTop: "2px", flexShrink: 0 }}>
                          {getStatusIcon(event.status)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--text-primary)",
                            }}
                          >
                            {event.event_name}
                          </div>
                          {event.message && isFailed && (
                            <div style={{ fontSize: "11px", color: "var(--status-failed-text)", marginTop: "2px" }}>
                              {event.message}
                            </div>
                          )}
                          {event.log_url && (
                            <a
                              href={event.log_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: "11px",
                                color: "var(--accent)",
                                textDecoration: "none",
                                marginTop: "4px",
                                display: "inline-block",
                              }}
                            >
                              View logs →
                            </a>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            color: getStatusColor(event.status),
                            whiteSpace: "nowrap",
                            marginTop: "2px",
                          }}
                        >
                          {event.status}
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            ) : null}

            {detail.can_rollback ? (
              <section className="drawer-section">
                <h4>Rollback</h4>
                <div className="rollback-warning">Rolling back will redeploy the previous successful revision to {detail.environment?.display_name ?? "this environment"}. This cannot be undone.</div>
                <button
                  type="button"
                  className="auth-btn auth-btn-primary rollback-btn"
                  onClick={() => setRollbackToast("Rollback coming in next update")}
                >
                  Roll back this deployment
                </button>
                {rollbackToast ? <div className="repo-toast-success drawer-toast">{rollbackToast}</div> : null}
              </section>
            ) : null}

            {detail.unified_status === "success" ? (
              <section className="drawer-section">
                <h4>Promote</h4>
                {promoteOptions.length === 0 ? (
                  <p>No target environments available for this repository.</p>
                ) : (
                  <>
                    <div className="dl-select-wrap" style={{ marginBottom: 8 }}>
                      <select
                        className="dl-filter-select"
                        value={promoteTargetId}
                        onChange={(event) => setPromoteTargetId(event.target.value)}
                      >
                        <option value="">Choose target environment</option>
                        {promoteOptions.map((env) => (
                          <option key={env.id} value={env.id}>{env.display_name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="auth-btn auth-btn-primary"
                      onClick={() => void handlePromote()}
                      disabled={!promoteTargetId || promoteLoading}
                    >
                      {promoteLoading ? "Promoting..." : "Promote deployment"}
                    </button>
                  </>
                )}
              </section>
            ) : null}

            {actionError ? <div className="repo-toast-error drawer-toast">{actionError}</div> : null}
            {actionSuccess ? <div className="repo-toast-success drawer-toast">{actionSuccess}</div> : null}

            {detail.is_rollback && detail.rollback_info ? (
              <section className="drawer-section">
                <h4>Rollback</h4>
                <div className="rollback-info-box">
                  This is a rollback deployment. Original deployment: {detail.rollback_info.rolled_back_from.commit_sha_short}
                </div>
                <button type="button" className="link-button" onClick={() => onOpenLinkedDeployment(detail.rollback_info!.rolled_back_from.id)}>Open original deployment</button>
              </section>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
