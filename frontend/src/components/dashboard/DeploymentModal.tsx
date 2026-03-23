import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, MinusCircle, RotateCcw, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deployments, github } from "../../lib/api";
import { unwatchDeployment, watchDeployment } from "../../lib/socket";
import { useAwsStore } from "../../store/awsStore";
import { DeploymentDetail } from "../../store/deploymentStore";
import StatusBadge from "./StatusBadge";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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
  if (s === "succeeded") return <CheckCircle2 size={18} color="#16a34a" />;
  if (s === "failed") return <XCircle size={18} color="#dc2626" />;
  if (s === "inprogress" || s === "in_progress") return <Loader2 size={18} color="#2563eb" className="dl-spin" />;
  if (s === "skipped") return <MinusCircle size={18} color="#cbd5e1" />;
  return <Clock size={18} color="#94a3b8" />;
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

  if (!open) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dl-modal-header">
          <div className="dl-modal-header-left">
            <StatusBadge status={detail?.unified_status ?? "pending"} size="lg" />
          </div>
          <div className="dl-modal-header-center">
            {detail && (
              <>
                <span className="dl-sha-pill">{detail.commit_sha_short}</span>
                <h3 className="dl-modal-title">{detail.commit_message ?? "No commit message"}</h3>
                <span className="dl-modal-env-label">
                  {detail.environment && (
                    <>
                      <span className="dl-env-dot" style={{ background: detail.environment.color_tag }} />
                      in {detail.environment.display_name}
                    </>
                  )}
                </span>
              </>
            )}
          </div>
          <button type="button" className="dl-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="dl-modal-body">
          {isLoading || !detail ? (
            <div className="dl-modal-loading">
              <Loader2 size={24} className="dl-spin" color="#94a3b8" />
              <span>Loading deployment details…</span>
            </div>
          ) : (
            <>
              {/* Overview Section */}
              <div className="dl-modal-section">
                <div className="dl-modal-section-header">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#64748b" strokeWidth="1.2"/><path d="M7 4v3h3" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span>Overview</span>
                </div>
                <div className="dl-modal-overview-grid">
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Repository</span>
                    <span className="dl-modal-kv-value dl-modal-link">
                      <a href={`https://github.com/${detail.repository.full_name}`} target="_blank" rel="noreferrer">
                        {detail.repository.full_name}
                      </a>
                    </span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Branch</span>
                    <span className="dl-modal-kv-value">{detail.branch}</span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Triggered by</span>
                    <span className="dl-modal-kv-value">{detail.triggered_by ?? "—"}</span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Started</span>
                    <span className="dl-modal-kv-value">{detail.started_at ? new Date(detail.started_at).toLocaleString() : "—"}</span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Finished</span>
                    <span className="dl-modal-kv-value">{detail.finished_at ? new Date(detail.finished_at).toLocaleString() : "—"}</span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Duration</span>
                    <span className="dl-modal-kv-value">
                      {detail.duration_seconds !== null
                        ? formatDuration(detail.duration_seconds)
                        : detail.started_at && detail.unified_status === "running"
                          ? formatDuration(Math.max(0, Math.floor((now - new Date(detail.started_at).getTime()) / 1000)))
                          : "—"}
                    </span>
                  </div>
                  <div className="dl-modal-kv">
                    <span className="dl-modal-kv-label">Is rollback</span>
                    <span className={`dl-modal-kv-value ${detail.is_rollback ? "dl-text-orange" : ""}`}>
                      {detail.is_rollback ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* GitHub Actions Section */}
              {detail.github_run_id && (
                <div className="dl-modal-section">
                  <div className="dl-modal-section-header">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#64748b" strokeWidth="1.2"/><path d="M5 7L6.5 8.5L9 5.5" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>GitHub Actions</span>
                    {detail.github_status && (
                      <span className="dl-modal-inline-badge">{detail.github_status}</span>
                    )}
                  </div>
                  {detail.github_run_url && (
                    <a href={detail.github_run_url} target="_blank" rel="noreferrer" className="dl-modal-ext-link">
                      View run on GitHub <ExternalLink size={12} />
                    </a>
                  )}
                  {detail.events.filter((e) => e.source === "github").length > 0 ? (
                    <div className="dl-modal-event-list">
                      {detail.events.filter((e) => e.source === "github").map((event) => (
                        <div key={`${event.source}-${event.event_name}`} className="dl-modal-event-row">
                          <span className="dl-modal-event-dot" />
                          <span className="dl-modal-event-name">{event.event_name}</span>
                          <span className="dl-modal-event-dur">{formatMs(event.duration_ms)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="dl-modal-no-data">No step data available</p>
                  )}

                  {detail.unified_status === "failed" ? (
                    <button
                      type="button"
                      className="auth-btn auth-btn-secondary"
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
                <div className="dl-modal-section">
                  <div className="dl-modal-section-header">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="#64748b" strokeWidth="1.2"/><path d="M5 7H9M7 5V9" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <span>CodeDeploy</span>
                    {detail.codedeploy_status && (
                      <span className="dl-modal-inline-badge">{detail.codedeploy_status}</span>
                    )}
                  </div>
                  {lifecycleEvents.length === 0 ? (
                    <p className="dl-modal-no-data">No step data available</p>
                  ) : (
                    <div className="dl-modal-lifecycle">
                      {lifecycleEvents.map((event) => {
                        const isFailed = event.status.toLowerCase() === "failed";
                        return (
                          <div key={`${event.source}-${event.event_name}`} className={`dl-modal-lifecycle-row ${isFailed ? "dl-modal-lifecycle-failed" : ""}`}>
                            <LifecycleIcon status={event.status} />
                            <div className="dl-modal-lifecycle-info">
                              <span className="dl-modal-lifecycle-name">{event.event_name}</span>
                              {isFailed && event.message && (
                                <span className="dl-modal-lifecycle-error">{event.message}</span>
                              )}
                              {isFailed && event.log_url && (
                                <a href={event.log_url} target="_blank" rel="noreferrer" className="dl-modal-ext-link dl-modal-ext-link-sm">
                                  View logs <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                            <span className="dl-modal-lifecycle-dur">{formatMs(event.duration_ms)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Rollback Section */}
              {detail.can_rollback && (
                <div className="dl-modal-section">
                  <div className="dl-modal-section-header">
                    <RotateCcw size={14} color="#64748b" />
                    <span>Rollback</span>
                  </div>
                  <div className="dl-modal-rollback-warning">
                    <AlertTriangle size={16} color="#d97706" />
                    <p>
                      Rolling back will redeploy the previous successful revision to{" "}
                      {detail.environment?.display_name ?? "this environment"}. This cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dl-modal-rollback-btn"
                    onClick={() => setRollbackToast("Rollback coming soon")}
                  >
                    Roll back this deployment
                  </button>
                  {rollbackToast && (
                    <div className="dl-toast-inline">{rollbackToast}</div>
                  )}
                </div>
              )}

              {detail.is_rollback && detail.rollback_info && (
                <div className="dl-modal-section">
                  <div className="dl-modal-section-header">
                    <RotateCcw size={14} color="#64748b" />
                    <span>Rollback</span>
                  </div>
                  <div className="dl-modal-rollback-info">
                    <RotateCcw size={14} color="#ea580c" />
                    <p>
                      This is a rollback. Original: {detail.rollback_info.rolled_back_from.commit_sha_short}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dl-modal-ext-link"
                    onClick={() => onOpenLinkedDeployment(detail.rollback_info!.rolled_back_from.id)}
                  >
                    Open original deployment
                  </button>
                </div>
              )}

              {detail.unified_status === "success" ? (
                <div className="dl-modal-section">
                  <div className="dl-modal-section-header">
                    <RotateCcw size={14} color="#64748b" />
                    <span>Promote</span>
                  </div>
                  {promoteOptions.length === 0 ? (
                    <p className="dl-modal-no-data">No target environments available for this repository.</p>
                  ) : (
                    <>
                      <select
                        className="analytics-repo-select"
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
                        className="auth-btn auth-btn-primary"
                        onClick={() => void handlePromote()}
                        disabled={!promoteTargetId || promoteLoading}
                      >
                        {promoteLoading ? "Promoting..." : "Promote deployment"}
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {actionError ? <div className="repo-toast-error drawer-toast">{actionError}</div> : null}
              {actionSuccess ? <div className="repo-toast-success drawer-toast">{actionSuccess}</div> : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="dl-modal-footer">
          <button type="button" className="dl-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
