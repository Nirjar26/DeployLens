import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { aggregator, aws, GithubTokenStatus, github, SyncStatus } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Tooltip from "../../components/shared/Tooltip";
import CopyButton from "../../components/shared/CopyButton";
import { useToast } from "../../hooks/useToast";

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-3.16 19.49c.5.09.69-.22.69-.49v-1.72c-2.8.6-3.39-1.19-3.39-1.19-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.61.07-.61 1 .08 1.53 1.03 1.53 1.03.88 1.52 2.31 1.08 2.87.83.09-.64.34-1.08.62-1.33-2.24-.25-4.59-1.12-4.59-4.98 0-1.1.4-2 1.03-2.71-.1-.26-.45-1.3.1-2.71 0 0 .85-.27 2.79 1.03A9.7 9.7 0 0112 6.84a9.7 9.7 0 012.54.34c1.94-1.3 2.79-1.03 2.79-1.03.55 1.41.2 2.45.1 2.71.64.71 1.03 1.61 1.03 2.71 0 3.87-2.36 4.73-4.61 4.98.35.3.67.89.67 1.8V21c0 .27.18.59.7.49A10 10 0 0012 2z" />
    </svg>
  );
}

function AwsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" fill="currentColor" />
      <path d="M12 2v20" stroke="var(--bg-surface)" strokeWidth="1.6" />
      <path d="M4 6.5l8 4.5 8-4.5" stroke="var(--bg-surface)" strokeWidth="1.6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm.75 3a.75.75 0 00-1.5 0V8c0 .2.08.39.22.53l2.2 2.2a.75.75 0 101.06-1.06L8.75 7.69V4.5z" />
    </svg>
  );
}

function WebhookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.5 1.5a3 3 0 012.98 2.63h-1.6a1.5 1.5 0 10-1.38 2.1h1.5v1.5H5.5a3 3 0 110-6zm5 2a3 3 0 010 6H9V8h1.5a1.5 1.5 0 000-3H9V3.5h1.5zM7 6.5h2v3H7v-3zm-1.5 5h5v1.5h-5V11.5z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm2.95 4.4l-3.43 3.6-1.47-1.39a.75.75 0 10-1.03 1.08l2.01 1.91c.3.28.77.27 1.05-.02l3.95-4.14a.75.75 0 10-1.08-1.04z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.2l6.1 11.3H1.9L8 1.2zm0 3a.75.75 0 00-.75.75v3.2a.75.75 0 001.5 0v-3.2A.75.75 0 008 4.2zm0 6.2a.9.9 0 100 1.8.9.9 0 000-1.8z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 2.2a5.8 5.8 0 015.37 3.6h1.18L12.8 8.1 11 5.8h1.03A4.3 4.3 0 008 3.7 4.3 4.3 0 004.1 6.4H2.56A5.8 5.8 0 018 2.2zm-4.36 5.7h1.56A4.3 4.3 0 008 12.3a4.3 4.3 0 003.9-2.7h-1.03l1.8-2.3 1.75 2.3h-1.18A5.8 5.8 0 018 13.8a5.8 5.8 0 01-5.36-3.9z" />
    </svg>
  );
}

function UnlinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6.35 4.94a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 11-1.06 1.06L6.35 4.94zM4.2 7.09a2.25 2.25 0 013.18 0l.53.53a.75.75 0 11-1.06 1.06l-.53-.53a.75.75 0 00-1.06 1.06l1.24 1.24A.75.75 0 015.44 11.5L4.2 10.27a2.25 2.25 0 010-3.18zm7.6-1.36a2.25 2.25 0 010 3.18l-1.24 1.23a.75.75 0 11-1.06-1.06l1.23-1.24a.75.75 0 10-1.06-1.06l-.53.53a.75.75 0 11-1.06-1.06l.53-.53a2.25 2.25 0 013.18 0zm-4.27 4.27a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06z" />
    </svg>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`settings-status-badge ${connected ? "connected" : "disconnected"}`}>
      <span className="dot" aria-hidden="true" />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function KvRow({ label, value, mono = false, success = false }: { label: string; value: string; mono?: boolean; success?: boolean }) {
  return (
    <div className="settings-kv-row">
      <span className="settings-kv-label">{label}</span>
      <span
        className={`settings-kv-value${mono ? " settings-mono" : ""}`}
        style={success ? { color: "var(--status-success-text)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "Never synced";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Never synced";
  const diff = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatUntil(value: string | null): string {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Math.max(0, Math.floor((time - Date.now()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);

  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsRegion = useAwsStore((state) => state.awsRegion);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);
  const disconnectAws = useAwsStore((state) => state.disconnectAws);
  const fetchAwsStatus = useAwsStore((state) => state.fetchAwsStatus);

  const [confirmType, setConfirmType] = useState<"github" | "aws" | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [tokenStatus, setTokenStatus] = useState<GithubTokenStatus | null>(null);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [syncingAws, setSyncingAws] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);

  useEffect(() => {
    void fetchTrackedRepos();
    void fetchAwsStatus();
    void aws.getSyncStatus().then(setSyncStatus).catch(() => undefined);
  }, [fetchAwsStatus, fetchTrackedRepos]);

  useEffect(() => {
    if (!githubConnected) {
      setTokenStatus(null);
      return;
    }

    void github.getTokenStatus().then(setTokenStatus).catch(() => {
      setTokenStatus({
        scopes: [],
        has_repo: false,
        has_workflow: false,
        valid: false,
        error: "Token invalid",
      });
    });
  }, [githubConnected]);

  async function handleDisconnectGithub() {
    try {
      await github.disconnect();
      await fetchTrackedRepos();
    } catch {
      // ignore
    }
  }

  async function handleDisconnectAws() {
    try {
      await disconnectAws();
      await fetchAwsStatus();
    } catch {
      // ignore
    }
  }

  async function handleSync(source: "github" | "aws") {
    try {
      if (source === "github") setSyncingGithub(true);
      if (source === "aws") setSyncingAws(true);
      await aggregator.run();
      const next = await aws.getSyncStatus();
      setSyncStatus(next);
      toast.success("Sync complete", "Latest deployment data has been refreshed");
    } catch {
      toast.error("Sync failed", "Sync failed, try again");
    } finally {
      if (source === "github") setSyncingGithub(false);
      if (source === "aws") setSyncingAws(false);
    }
  }

  const health = useMemo(() => {
    if (githubConnected && awsConnected) {
      return {
        kind: "success" as const,
        message: "All integrations connected - DeployLens is fully operational",
      };
    }

    if (githubConnected && !awsConnected) {
      return {
        kind: "warning" as const,
        message: "GitHub connected but AWS is not - deployment tracking is incomplete",
      };
    }

    if (!githubConnected && awsConnected) {
      return {
        kind: "warning" as const,
        message: "AWS connected but GitHub is not - build data unavailable",
      };
    }

    return null;
  }, [githubConnected, awsConnected]);

  const githubInitial = (githubUsername?.charAt(0) ?? "G").toUpperCase();
  const webhookUrl = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/webhooks/github`;

  const rateRemaining = syncStatus?.github_rate_limit_remaining ?? null;
  const rateReset = syncStatus?.github_rate_limit_reset ?? null;
  const ratePercent = rateRemaining !== null ? Math.max(0, Math.min(100, (rateRemaining / 5000) * 100)) : 0;
  const rateClass = ratePercent > 60 ? "high" : ratePercent >= 20 ? "mid" : "low";
  const webhookStatusRows = useMemo(() => {
    return trackedRepos.slice(0, 5).map((repo) => {
      const maybeSecret = (repo as unknown as { webhook_secret_exists?: boolean }).webhook_secret_exists;
      const hasWebhook = Boolean(maybeSecret);
      return {
        id: repo.id,
        name: repo.full_name || `${repo.owner || "unknown"}/${repo.name || "repo"}`,
        hasWebhook,
      };
    });
  }, [trackedRepos]);
  const remainingWebhookCount = Math.max(0, trackedRepos.length - webhookStatusRows.length);

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Manage your GitHub and AWS connections"
      />
      <SettingsLayout>
        <div className="settings-config-wrap">
          {health ? (
            <div className={`settings-health-banner ${health.kind}`}>
              {health.kind === "success" ? <CheckCircleIcon /> : <WarningIcon />}
              <span>{health.message}</span>
            </div>
          ) : null}

          <div className="settings-integrations-grid">
            <section className="settings-card">
              <header className="settings-card-header">
                <div className="settings-card-title">
                  <GithubIcon />
                  <span>GitHub</span>
                </div>
                <StatusBadge connected={githubConnected} />
              </header>
              <div className="settings-card-body">
                {githubConnected ? (
                  <>
                    <div className="settings-account-row">
                      <div className="settings-account-avatar">{githubInitial}</div>
                      <div className="settings-account-meta">
                        <div className="settings-account-title">@{githubUsername ?? "unknown"}</div>
                        <div className="settings-account-sub">GitHub account connected</div>
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-kv-grid">
                      <KvRow label="Status" value="Connected" success />
                      <KvRow label="Scopes" value="repo, workflow" mono />
                      <KvRow label="Username" value={`@${githubUsername ?? "unknown"}`} />
                      <KvRow label="Repos" value={`${trackedRepos.length} repositories tracked`} />
                    </div>

                    {tokenStatus?.valid === false ? (
                      <div className="settings-alert danger">
                        <WarningIcon />
                        <div>
                          <div className="title">GitHub token is invalid or expired. Reconnect to fix.</div>
                        </div>
                      </div>
                    ) : null}

                    {tokenStatus?.valid && tokenStatus.has_workflow === false ? (
                      <div className="settings-alert warning">
                        <WarningIcon />
                        <div style={{ flex: 1 }}>
                          <div className="title">Missing workflow permission</div>
                          <div className="body">Re-run workflow feature will not work. Reconnect GitHub to grant workflow access.</div>
                        </div>
                        <button
                          type="button"
                          className="settings-btn settings-btn-secondary"
                          onClick={() => navigate("/onboarding/github")}
                        >
                          Reconnect
                        </button>
                      </div>
                    ) : null}

                    <div className="settings-sync-grid">
                      <div className="settings-sync-item">
                        <div className="settings-sync-meta">
                          <ClockIcon />
                          <span>Last synced: {formatRelativeTime(syncStatus?.github_last_synced ?? null)}</span>
                        </div>
                        <button
                          type="button"
                          className="settings-sync-btn"
                          onClick={() => void handleSync("github")}
                          disabled={syncingGithub}
                        >
                          <RefreshIcon />
                          {syncingGithub ? "Syncing..." : "Sync now"}
                        </button>
                      </div>
                      <div className="settings-sync-item">
                        <div className="settings-rate-row">
                          <span className="settings-rate-label">API Rate limit:</span>
                          <div className="settings-rate-track">
                            <div className={`settings-rate-fill ${rateClass}`} style={{ width: `${ratePercent}%` }} />
                          </div>
                          <span className="settings-rate-value">{rateRemaining ?? "-"} / 5000</span>
                        </div>
                        {rateRemaining !== null && rateRemaining < 500 && rateReset ? (
                          <Tooltip content={`Resets in ${formatUntil(rateReset)}`}>
                            <span className="settings-rate-reset">Resets in {formatUntil(rateReset)}</span>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-card-actions">
                      <button
                        type="button"
                        className="settings-btn settings-btn-secondary"
                        onClick={() => navigate("/onboarding/github")}
                      >
                        <RefreshIcon />
                        Reconnect
                      </button>
                      <button
                        type="button"
                        className="settings-btn settings-btn-danger"
                        onClick={() => setConfirmType("github")}
                      >
                        <UnlinkIcon />
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="settings-empty">
                    <GithubIcon size={32} />
                    <h4>GitHub not connected</h4>
                    <p>Connect to start tracking deployments</p>
                    <button
                      type="button"
                      className="settings-btn settings-btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => navigate("/onboarding/github")}
                    >
                      Connect GitHub
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="settings-card">
              <header className="settings-card-header">
                <div className="settings-card-title">
                  <span style={{ color: "var(--status-rolledback-text)", display: "inline-flex" }}>
                    <AwsIcon />
                  </span>
                  <span>Amazon Web Services</span>
                </div>
                <StatusBadge connected={awsConnected} />
              </header>
              <div className="settings-card-body">
                {awsConnected ? (
                  <>
                    <div className="settings-account-row">
                      <div className="settings-account-badge">AWS</div>
                      <div className="settings-account-meta">
                        <div className="settings-account-title">{awsAccountAlias || "AWS Account"}</div>
                        <div className="settings-account-sub">{awsRegion || "Region unavailable"}</div>
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-kv-grid">
                      <KvRow label="Account ID" value={awsAccountId || "-"} mono />
                      <KvRow label="Region" value={awsRegion || "-"} />
                      <KvRow label="Alias" value={awsAccountAlias || "-"} />
                      <KvRow label="Status" value={awsAccountId ? "Credentials valid" : "Unknown"} success={Boolean(awsAccountId)} />
                    </div>

                    <div className="settings-sync-grid single">
                      <div className="settings-sync-item">
                        <div className="settings-sync-meta">
                          <ClockIcon />
                          <span>Last synced: {formatRelativeTime(syncStatus?.aws_last_synced ?? null)}</span>
                        </div>
                        <button
                          type="button"
                          className="settings-sync-btn"
                          onClick={() => void handleSync("aws")}
                          disabled={syncingAws}
                        >
                          <RefreshIcon />
                          {syncingAws ? "Syncing..." : "Sync now"}
                        </button>
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-card-actions">
                      <button
                        type="button"
                        className="settings-btn settings-btn-secondary"
                        onClick={() => navigate("/onboarding/aws")}
                      >
                        <RefreshIcon />
                        Update credentials
                      </button>
                      <button
                        type="button"
                        className="settings-btn settings-btn-danger"
                        onClick={() => setConfirmType("aws")}
                      >
                        <UnlinkIcon />
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="settings-empty">
                    <span style={{ color: "var(--status-rolledback-text)", display: "inline-flex" }}>
                      <AwsIcon size={32} />
                    </span>
                    <h4>AWS not connected</h4>
                    <p>Connect to track CodeDeploy deployments</p>
                    <button
                      type="button"
                      className="settings-btn settings-btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => navigate("/onboarding/aws")}
                    >
                      Connect AWS
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="settings-card">
            <header className="settings-card-header">
              <div className="settings-card-title">
                <WebhookIcon />
                <span>Webhook Endpoint</span>
              </div>
              <StatusBadge connected={githubConnected} />
            </header>
            <div className="settings-card-body settings-webhook-layout">
              <div className="settings-webhook-main">
                <div className="settings-webhook-url-row">
                  <span className="settings-kv-label">Endpoint URL</span>
                  <div className="settings-webhook-url-wrap">
                    <Tooltip content={webhookUrl}>
                      <span className="settings-webhook-url settings-mono">{webhookUrl}</span>
                    </Tooltip>
                    <CopyButton text={webhookUrl} />
                  </div>
                </div>

                <button
                  type="button"
                  className="settings-webhook-toggle"
                  onClick={() => setWebhookOpen((current) => !current)}
                >
                  How to configure webhooks {webhookOpen ? "▲" : "▼"}
                </button>

                {webhookOpen ? (
                  <div className="settings-steps-wrap">
                    <div className="settings-step-row">
                      <span className="settings-step-number">1</span>
                      <div>
                        <div className="settings-step-title">Copy the endpoint URL above</div>
                      </div>
                    </div>
                    <div className="settings-step-row">
                      <span className="settings-step-number">2</span>
                      <div>
                        <div className="settings-step-title">Go to GitHub repo settings and add webhook</div>
                        <div className="settings-step-body">Use the repository webhook secret from the Repositories page.</div>
                      </div>
                    </div>
                    <div className="settings-step-row">
                      <span className="settings-step-number">3</span>
                      <div>
                        <div className="settings-step-title">Select event and content type</div>
                        <div className="settings-step-body">Choose Workflow runs event only and set content type to application/json.</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="settings-webhook-status">
                <div className="settings-webhook-status-title">Endpoint status</div>
                {webhookStatusRows.length === 0 ? (
                  <div className="settings-webhook-status-empty">No repositories tracked</div>
                ) : (
                  <div className="settings-webhook-status-list">
                    {webhookStatusRows.map((row) => (
                      <div key={row.id} className="settings-webhook-status-row">
                        <span className="settings-webhook-status-name" title={row.name}>{row.name}</span>
                        <span className={`settings-webhook-status-dot ${row.hasWebhook ? "ok" : "warn"}`} />
                        <span className="settings-webhook-status-text">
                          {row.hasWebhook ? "Receiving events" : "Not configured"}
                        </span>
                      </div>
                    ))}
                    {remainingWebhookCount > 0 ? (
                      <div className="settings-webhook-status-more">+{remainingWebhookCount} more</div>
                    ) : null}
                  </div>
                )}
              </aside>
            </div>
          </section>
        </div>

        <ConfirmModal
          isOpen={confirmType === "github"}
          title="Disconnect GitHub"
          body={"This will remove your GitHub connection.\nDeployment history will be preserved but\nno new data will be synced."}
          confirmLabel="Yes, disconnect"
          confirmVariant="danger"
          onConfirm={handleDisconnectGithub}
          onCancel={() => setConfirmType(null)}
        />

        <ConfirmModal
          isOpen={confirmType === "aws"}
          title="Disconnect AWS"
          body={"This will remove your AWS credentials.\nDeployment history will be preserved but\nCodeDeploy data will stop syncing."}
          confirmLabel="Yes, disconnect"
          confirmVariant="danger"
          onConfirm={handleDisconnectAws}
          onCancel={() => setConfirmType(null)}
        />
      </SettingsLayout>
    </>
  );
}
