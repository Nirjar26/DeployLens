import { ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
    }
  }, [open]);

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

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="deployment-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <StatusBadge status={detail?.unified_status ?? "pending"} size="lg" />
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
          {detail ? (
            <>
              <div className="sha-pill large">{detail.commit_sha_short}</div>
              <h3>{detail.commit_message ?? "No commit message"}</h3>
              <p>{detail.environment ? `in ${detail.environment.display_name}` : "Unassigned environment"}</p>
            </>
          ) : null}
        </header>

        {isLoading || !detail ? (
          <div className="drawer-body"><div className="repo-skeleton" /><div className="repo-skeleton" /><div className="repo-skeleton" /></div>
        ) : (
          <div className="drawer-body">
            <section className="drawer-section">
              <h4>Overview</h4>
              <div className="overview-grid">
                <div><strong>Repository:</strong> {detail.repository.full_name}</div>
                <div><strong>Branch:</strong> {detail.branch}</div>
                <div><strong>Triggered by:</strong> {detail.triggered_by ?? "—"}</div>
                <div><strong>Started:</strong> {detail.started_at ? new Date(detail.started_at).toLocaleString() : "—"}</div>
                <div><strong>Finished:</strong> {detail.finished_at ? new Date(detail.finished_at).toLocaleString() : "—"}</div>
                <div>
                  <strong>Duration:</strong> {detail.duration_seconds !== null
                    ? formatDuration(detail.duration_seconds)
                    : detail.started_at && detail.unified_status === "running"
                      ? formatDuration(Math.max(0, Math.floor((now - new Date(detail.started_at).getTime()) / 1000)))
                      : "—"}
                </div>
                <div><strong>Is rollback:</strong> {detail.is_rollback ? "Yes" : "No"}</div>
              </div>
            </section>

            {detail.github_run_url ? (
              <section className="drawer-section">
                <h4>GitHub Actions</h4>
                <a href={detail.github_run_url} target="_blank" rel="noreferrer" className="link-button">View run on GitHub <ExternalLink size={12} /></a>
                {detail.events.filter((e) => e.source === "github").length === 0 ? <p>No step data available</p> : null}
              </section>
            ) : null}

            {detail.codedeploy_id ? (
              <section className="drawer-section">
                <h4>CodeDeploy</h4>
                {lifecycleEvents.length === 0 ? <p>No step data available</p> : lifecycleEvents.map((event) => (
                  <div key={`${event.source}-${event.event_name}`} className="event-row">
                    <div>
                      <strong>{event.event_name}</strong>
                      {event.message ? <p>{event.message}</p> : null}
                      {event.log_url ? <a href={event.log_url} target="_blank" rel="noreferrer">View logs</a> : null}
                    </div>
                    <span>{event.status}</span>
                  </div>
                ))}
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
