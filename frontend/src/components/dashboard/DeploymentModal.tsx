import { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, MinusCircle, RotateCcw, X, XCircle, Info, SkipForward, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deployments, github } from "../../lib/api";
import { unwatchDeployment, watchDeployment } from "../../lib/socket";
import { useAwsStore } from "../../store/awsStore";
import { DeploymentDetail } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";
import { formatDuration, formatElapsed } from "../../lib/formatters";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type Props = {
  open: boolean;
  detail: DeploymentDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onOpenLinkedDeployment: (id: string) => void;
};

const eventOrder = ["ApplicationStop", "BeforeInstall", "AfterInstall", "ApplicationStart", "ValidateService"];

function LifecycleIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "succeeded") return <CheckCircle2 size={18} color="var(--status-success)" />;
  if (s === "failed") return <XCircle size={18} color="var(--status-failed)" />;
  if (s === "inprogress" || s === "in_progress") return <Loader2 size={18} color="var(--status-running)" style={{ animation: "spin 1.5s linear infinite" }} />;
  if (s === "skipped") return <MinusCircle size={18} color="var(--text-muted)" />;
  return <Clock size={18} color="var(--text-muted)" />;
}

export default function DeploymentModal({ open, detail, isLoading, onClose, onOpenLinkedDeployment }: Props) {
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      setPromoteTargetId("");
      setActionError(null);
      setActionSuccess(null);
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
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
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

  // Style definitions
  const modalOverlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  };

  const modalContainerStyle: CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-lg)",
    width: "90%",
    maxWidth: "620px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "var(--shadow-xl)",
    animation: "modalIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  const modalHeaderStyle: CSSProperties = {
    backgroundColor: "var(--bg-sunken)",
    borderBottom: "1px solid var(--border-light)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  };

  const modalHeaderLeftStyle: CSSProperties = {
    flex: "0 0 auto",
  };

  const modalHeaderCenterStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const shaPillStyle: CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    backgroundColor: "var(--accent-light)",
    color: "var(--accent)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    width: "fit-content",
  };

  const modalTitleStyle: CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const modalEnvLabelStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const envDotStyle: CSSProperties = {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "var(--radius-full)",
  };

  const modalCloseStyle: CSSProperties = {
    flex: "0 0 auto",
    padding: "4px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all var(--transition-fast)",
  };

  const modalBodyStyle: CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const modalLoadingStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "40px 20px",
    color: "var(--text-muted)",
  };

  const modalSectionStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "var(--bg-sunken)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-light)",
  };

  const modalSectionHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const modalInlineBadgeStyle: CSSProperties = {
    marginLeft: "auto",
    padding: "2px 8px",
    backgroundColor: "var(--accent-light)",
    color: "var(--accent)",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
    fontWeight: 600,
  };

  const modalExtLinkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--accent)",
    fontSize: "13px",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const modalOverviewGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  };

  const modalKvStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  };

  const modalKvLabelStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--text-muted)",
  };

  const modalKvValueStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
  };

  const modalEventListStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const modalEventRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid var(--border-light)",
  };

  const modalEventDotStyle: CSSProperties = {
    display: "inline-block",
    width: "4px",
    height: "4px",
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--accent)",
    flex: "0 0 auto",
  };

  const modalEventNameStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    flex: 1,
  };

  const modalEventDurStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    flex: "0 0 auto",
  };

  const modalLifecycleStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const modalLifecycleRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
  };

  const modalLifecycleFailedStyle: CSSProperties = {
    ...modalLifecycleRowStyle,
    backgroundColor: "rgba(220, 38, 38, 0.05)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  };

  const modalLifecycleInfoStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const modalLifecycleNameStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const modalLifecycleErrorStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--status-failed)",
    fontWeight: 500,
  };

  const modalLifecycleDurStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    flex: "0 0 auto",
  };

  const modalRollbackWarningStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    borderLeft: "3px solid var(--status-warning)",
    color: "var(--text-primary)",
  };

  const modalRollbackWarningTextStyle: CSSProperties = {
    fontSize: "13px",
    margin: 0,
  };

  const modalRollbackBtnStyle: CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "var(--status-failed)",
    color: "var(--text-on-accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const toastInlineStyle: CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "var(--accent-light)",
    color: "var(--accent)",
    borderRadius: "var(--radius-md)",
    fontSize: "12px",
    fontWeight: 500,
    marginTop: "8px",
  };

  const noDataStyle: CSSProperties = {
    fontSize: "13px",
    color: "var(--text-muted)",
    fontStyle: "italic",
    margin: 0,
    padding: "8px 0",
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  };

  const primaryBtnStyle: CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "var(--accent)",
    color: "var(--text-on-accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    marginTop: "8px",
  };

  const secondaryBtnStyle: CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "var(--bg-sunken)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    marginTop: "8px",
  };

  const errorToastStyle: CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    color: "var(--status-failed)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(220, 38, 38, 0.3)",
    fontSize: "13px",
    fontWeight: 500,
    marginTop: "8px",
  };

  const successToastStyle: CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    color: "var(--status-success)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(22, 163, 74, 0.3)",
    fontSize: "13px",
    fontWeight: 500,
    marginTop: "8px",
  };

  const modalFooterStyle: CSSProperties = {
    padding: "12px 20px",
    borderTop: "1px solid var(--border-light)",
    backgroundColor: "var(--bg-sunken)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  };

  const closeButtonStyle: CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  if (!open) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContainerStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div style={modalHeaderLeftStyle}>
            <StatusBadge status={detail?.unified_status ?? "pending"} size="lg" />
          </div>
          <div style={modalHeaderCenterStyle}>
            {detail && (
              <>
                <span style={shaPillStyle}>{detail.commit_sha_short}</span>
                <h3 style={modalTitleStyle}>{detail.commit_message ?? "No commit message"}</h3>
                <span style={modalEnvLabelStyle}>
                  {detail.environment && (
                    <>
                      <span style={{ ...envDotStyle, background: detail.environment.color_tag }} />
                      in {detail.environment.display_name}
                    </>
                  )}
                </span>
              </>
            )}
          </div>
          <button type="button" style={modalCloseStyle} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          {isLoading || !detail ? (
            <div style={modalLoadingStyle}>
              <Loader2 size={24} style={{ animation: "spin 1.5s linear infinite" }} color="var(--text-muted)" />
              <span>Loading deployment details…</span>
            </div>
          ) : (
            <>
              {/* Overview Section */}
              <div style={modalSectionStyle}>
                <div style={modalSectionHeaderStyle}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M7 4v3h3" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span>Overview</span>
                </div>
                <div style={modalOverviewGridStyle}>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Repository</span>
                    <span style={modalKvValueStyle}>
                      <a href={`https://github.com/${detail.repository.full_name}`} target="_blank" rel="noreferrer" style={modalExtLinkStyle}>
                        {detail.repository.full_name}
                      </a>
                    </span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Branch</span>
                    <span style={modalKvValueStyle}>{detail.branch}</span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Triggered by</span>
                    <span style={modalKvValueStyle}>{detail.triggered_by ?? "—"}</span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Started</span>
                    <span style={modalKvValueStyle}>{detail.started_at ? new Date(detail.started_at).toLocaleString() : "—"}</span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Finished</span>
                    <span style={modalKvValueStyle}>{detail.finished_at ? new Date(detail.finished_at).toLocaleString() : "—"}</span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>
                      {detail.unified_status === "running" ? "Running for" : "Duration"}
                    </span>
                    <span style={{
                      ...modalKvValueStyle,
                      color: detail.unified_status === "running" ? "var(--status-running-text)" : "var(--text-primary)",
                    }}>
                      {detail.unified_status === "running" && detail.started_at
                        ? formatElapsed(detail.started_at).replace(" ago", "")
                        : detail.duration_seconds !== null
                          ? formatDuration(detail.duration_seconds)
                          : "—"}
                    </span>
                  </div>
                  <div style={modalKvStyle}>
                    <span style={modalKvLabelStyle}>Is rollback</span>
                    <span style={{
                      ...modalKvValueStyle,
                      color: detail.is_rollback ? "var(--status-warning)" : "var(--text-primary)",
                    }}>
                      {detail.is_rollback ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* GitHub Actions Section */}
              {detail.github_run_id && (
                <div style={modalSectionStyle}>
                  <div style={modalSectionHeaderStyle}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M5 7L6.5 8.5L9 5.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>GitHub Actions</span>
                    {detail.github_status && (
                      <span style={modalInlineBadgeStyle}>{detail.github_status}</span>
                    )}
                  </div>
                  {detail.github_run_url && (
                    <a href={detail.github_run_url} target="_blank" rel="noreferrer" style={modalExtLinkStyle}>
                      View run on GitHub <ExternalLink size={12} />
                    </a>
                  )}
                  {detail.events.filter((e) => e.source === "github").length > 0 ? (
                    <div style={modalEventListStyle}>
                      {detail.events.filter((e) => e.source === "github").map((event) => (
                        <div key={`${event.source}-${event.event_name}`} style={modalEventRowStyle}>
                          <span style={modalEventDotStyle} />
                          <span style={modalEventNameStyle}>{event.event_name}</span>
                          <span style={modalEventDurStyle}>{formatMs(event.duration_ms)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={noDataStyle}>No step data available</p>
                  )}

                  {detail.unified_status === "failed" ? (
                    <button
                      type="button"
                      style={secondaryBtnStyle}
                      onClick={() => void handleRerun()}
                      disabled={rerunLoading}
                    >
                      {rerunLoading ? "Triggering..." : "Re-run workflow"}
                    </button>
                  ) : null}
                </div>
              )}

              {/* CodeDeploy Section */}
              {detail.codedeploy_id && (
                <div style={modalSectionStyle}>
                  <div style={modalSectionHeaderStyle}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M5 7H9M7 5V9" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <span>CodeDeploy</span>
                    {detail.codedeploy_status && (
                      <span style={modalInlineBadgeStyle}>{detail.codedeploy_status}</span>
                    )}
                  </div>
                  {lifecycleEvents.length === 0 ? (
                    <p style={noDataStyle}>No step data available</p>
                  ) : (
                    <div style={modalLifecycleStyle}>
                      {lifecycleEvents.map((event) => {
                        const isFailed = event.status.toLowerCase() === "failed";
                        return (
                          <div key={`${event.source}-${event.event_name}`} style={isFailed ? modalLifecycleFailedStyle : modalLifecycleRowStyle}>
                            <LifecycleIcon status={event.status} />
                            <div style={modalLifecycleInfoStyle}>
                              <span style={modalLifecycleNameStyle}>{event.event_name}</span>
                              {isFailed && event.message && (
                                <span style={modalLifecycleErrorStyle}>{event.message}</span>
                              )}
                              {isFailed && event.log_url && (
                                <a href={event.log_url} target="_blank" rel="noreferrer" style={{ ...modalExtLinkStyle, fontSize: "12px" }}>
                                  View logs <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                            <span style={modalLifecycleDurStyle}>{formatMs(event.duration_ms)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Rollback Section */}
              {detail.can_rollback && (
                <div style={modalSectionStyle}>
                  <div style={modalSectionHeaderStyle}>
                    <RotateCcw size={14} color="var(--text-muted)" />
                    <span>Rollback</span>
                  </div>
                  <div style={modalRollbackWarningStyle}>
                    <AlertTriangle size={16} color="var(--status-warning)" style={{ flex: "0 0 auto" }} />
                    <p style={modalRollbackWarningTextStyle}>
                      Rolling back will redeploy the previous successful revision to{" "}
                      {detail.environment?.display_name ?? "this environment"}. This cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    style={modalRollbackBtnStyle}
                    onClick={() => setRollbackToast("Rollback coming soon")}
                  >
                    Roll back this deployment
                  </button>
                  {rollbackToast && (
                    <div style={toastInlineStyle}>{rollbackToast}</div>
                  )}
                </div>
              )}

              {detail.is_rollback && detail.rollback_info && (
                <div style={modalSectionStyle}>
                  <div style={modalSectionHeaderStyle}>
                    <RotateCcw size={14} color="var(--text-muted)" />
                    <span>Rollback</span>
                  </div>
                  <div style={{
                    ...modalRollbackWarningStyle,
                    backgroundColor: "rgba(234, 88, 12, 0.08)",
                    borderLeftColor: "var(--status-rolled-back)",
                  }}>
                    <RotateCcw size={14} color="var(--status-rolled-back)" style={{ flex: "0 0 auto" }} />
                    <p style={modalRollbackWarningTextStyle}>
                      This is a rollback. Original: {detail.rollback_info.rolled_back_from.commit_sha_short}
                    </p>
                  </div>
                  <button
                    type="button"
                    style={modalExtLinkStyle}
                    onClick={() => onOpenLinkedDeployment(detail.rollback_info!.rolled_back_from.id)}
                  >
                    Open original deployment
                  </button>
                </div>
              )}

              {detail.unified_status === "success" ? (
                <div style={modalSectionStyle}>
                  <div style={modalSectionHeaderStyle}>
                    <RotateCcw size={14} color="var(--text-muted)" />
                    <span>Promote</span>
                  </div>
                  {promoteOptions.length === 0 ? (
                    <p style={noDataStyle}>No target environments available for this repository.</p>
                  ) : (
                    <>
                      <select
                        style={selectStyle}
                        value={promoteTargetId}
                        onChange={(event) => setPromoteTargetId(event.target.value)}
                      >
                        <option value="">Choose target environment</option>
                        {promoteOptions.map((env) => (
                          <option key={env.id} value={env.id}>{env.display_name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        style={{
                          ...primaryBtnStyle,
                          opacity: !promoteTargetId || promoteLoading ? 0.5 : 1,
                          cursor: !promoteTargetId || promoteLoading ? "not-allowed" : "pointer",
                        }}
                        onClick={() => void handlePromote()}
                        disabled={!promoteTargetId || promoteLoading}
                      >
                        {promoteLoading ? "Promoting..." : "Promote deployment"}
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {actionError ? <div style={errorToastStyle}>{actionError}</div> : null}
              {actionSuccess ? <div style={successToastStyle}>{actionSuccess}</div> : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button type="button" style={closeButtonStyle} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
