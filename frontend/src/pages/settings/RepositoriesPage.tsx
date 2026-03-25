import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { github, RepoDeploymentStats, TrackedRepo } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Tooltip from "../../components/shared/Tooltip";
import CopyButton from "../../components/shared/CopyButton";
import { useToast } from "../../hooks/useToast";

type TrackedRepoWithMeta = TrackedRepo & {
  added_at?: string;
  created_at?: string;
  updated_at?: string;
  webhook_secret_exists?: boolean;
};

type SortKey = "recent" | "name_asc" | "name_desc" | "deployments_desc" | "synced_desc";
type FilterKey = "all" | "active" | "inactive";

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a.75.75 0 01.75.75v5h5a.75.75 0 010 1.5h-5v5a.75.75 0 01-1.5 0v-5h-5a.75.75 0 010-1.5h5v-5A.75.75 0 018 1.5z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 2h5l2 2h5a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM11 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM5 6v2.5A3.5 3.5 0 008.5 12H9v-1.5h-.5A2 2 0 016.5 8.5V6H5zm6-4.5h-1.5v8H11v-8z" />
    </svg>
  );
}

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={spinning ? "spin-inline" : ""}>
      <path d="M8 2.2a5.8 5.8 0 015.37 3.6h1.18L12.8 8.1 11 5.8h1.03A4.3 4.3 0 008 3.7 4.3 4.3 0 004.1 6.4H2.56A5.8 5.8 0 018 2.2zm-4.36 5.7h1.56A4.3 4.3 0 008 12.3a4.3 4.3 0 003.9-2.7h-1.03l1.8-2.3 1.75 2.3h-1.18A5.8 5.8 0 018 13.8a5.8 5.8 0 01-5.36-3.9z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.6 10.54l3.2 3.2-1.06 1.06-3.2-3.2a5.5 5.5 0 111.06-1.06zM6.5 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 3C4 3 1.2 6 1 8c.2 2 3 5 7 5s6.8-3 7-5c-.2-2-3-5-7-5zm0 8.5A3.5 3.5 0 118 4.5a3.5 3.5 0 010 7zm0-5.5a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 111.06 1.06L9.06 8l2.72 2.72a.75.75 0 01-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 01-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

function statusClass(value: string | null): "success" | "failed" | "running" | "pending" {
  if (!value) return "pending";
  if (value === "success") return "success";
  if (value === "failed" || value === "rolled_back") return "failed";
  if (value === "running") return "running";
  return "pending";
}

function formatRelativeTime(dateLike?: string | null): string {
  if (!dateLike) return "No deployments yet";
  const time = new Date(dateLike).getTime();
  if (Number.isNaN(time)) return "No deployments yet";
  const diffSeconds = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export default function RepositoriesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const trackedRepos = useAuthStore((state) => state.trackedRepos) as TrackedRepoWithMeta[];
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);

  const [repoStats, setRepoStats] = useState<Record<string, RepoDeploymentStats>>({});
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [confirmRepoId, setConfirmRepoId] = useState<string | null>(null);
  const [confirmBulkDisable, setConfirmBulkDisable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncingByRepo, setSyncingByRepo] = useState<Record<string, boolean>>({});

  const [secretModalRepo, setSecretModalRepo] = useState<TrackedRepoWithMeta | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretValue, setSecretValue] = useState("");

  useEffect(() => {
    async function load() {
      try {
        await fetchTrackedRepos();
        const stats = await github.getRepoStats();
        const map = stats.reduce<Record<string, RepoDeploymentStats>>((acc, item) => {
          acc[item.repository_id] = item;
          return acc;
        }, {});
        setRepoStats(map);
      } catch {
        setRepoStats({});
      }
    }

    void load();
  }, [fetchTrackedRepos]);

  useEffect(() => {
    if (!secretVisible) return;
    const timer = window.setTimeout(() => {
      setSecretVisible(false);
      setSecretValue("");
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [secretVisible]);

  async function handleUntrack(repoId: string) {
    await github.untrackRepo(repoId);
    await fetchTrackedRepos();
    toast.info("Repository disabled");
  }

  const activeCount = useMemo(() => trackedRepos.filter((repo) => repo.is_active).length, [trackedRepos]);
  const inactiveCount = trackedRepos.length - activeCount;
  const repoToDisable = trackedRepos.find((repo) => repo.id === confirmRepoId);

  const filteredRepos = useMemo(() => {
    const query = search.trim().toLowerCase();
    let repos = trackedRepos.filter((repo) => {
      const fullName = repo.full_name ?? `${repo.owner ?? ""}/${repo.name ?? ""}`;
      if (filterKey === "active" && !repo.is_active) return false;
      if (filterKey === "inactive" && repo.is_active) return false;
      if (!query) return true;
      return fullName.toLowerCase().includes(query);
    });

    repos = [...repos].sort((a, b) => {
      if (sortKey === "name_asc") return a.full_name.localeCompare(b.full_name);
      if (sortKey === "name_desc") return b.full_name.localeCompare(a.full_name);
      if (sortKey === "deployments_desc") {
        return (repoStats[b.id]?.total_deployments ?? 0) - (repoStats[a.id]?.total_deployments ?? 0);
      }
      if (sortKey === "synced_desc") {
        const aTime = new Date(repoStats[a.id]?.last_deployment_at ?? a.updated_at ?? a.added_at ?? 0).getTime();
        const bTime = new Date(repoStats[b.id]?.last_deployment_at ?? b.updated_at ?? b.added_at ?? 0).getTime();
        return bTime - aTime;
      }

      const aTime = new Date(a.added_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.added_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    });

    return repos;
  }, [trackedRepos, filterKey, search, sortKey, repoStats]);

  async function syncRepo(repoId: string) {
    try {
      setSyncingByRepo((current) => ({ ...current, [repoId]: true }));
      const result = await github.syncRepo(repoId);
      const stats = await github.getRepoStats();
      const map = stats.reduce<Record<string, RepoDeploymentStats>>((acc, item) => {
        acc[item.repository_id] = item;
        return acc;
      }, {});
      setRepoStats(map);
      toast.success(`${result.synced} deployments synced`);
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncingByRepo((current) => ({ ...current, [repoId]: false }));
    }
  }

  function toggleSelection(repoId: string) {
    setSelectedIds((current) => (current.includes(repoId) ? current.filter((id) => id !== repoId) : [...current, repoId]));
  }

  async function bulkDisable() {
    const ids = selectedIds;
    for (const id of ids) {
      await github.untrackRepo(id);
    }
    await fetchTrackedRepos();
    setSelectedIds([]);
    toast.info("Selected repositories disabled");
  }

  return (
    <>
      <PageHeader
        title="Repositories"
        subtitle="Repos being monitored for deployments"
        actions={(
          <button
            type="button"
            className="settings-btn settings-btn-primary settings-toolbar-btn"
            onClick={() => navigate("/onboarding/repos")}
          >
            <PlusIcon />
            Add repositories
          </button>
        )}
      />
      <SettingsLayout maxWidth="980px">
        <div className="settings-config-wrap">
          <div className="settings-stat-row">
            <div className="settings-stat-chip">
              <span className="settings-stat-dot active" aria-hidden="true" />
              <span className="settings-stat-number">{activeCount}</span>
              <span className="settings-stat-label">Active</span>
            </div>
            <div className="settings-stat-chip">
              <span className="settings-stat-dot inactive" aria-hidden="true" />
              <span className="settings-stat-number">{inactiveCount}</span>
              <span className="settings-stat-label">Inactive</span>
            </div>
          </div>

          <div className="settings-repo-toolbar">
            <select className="settings-repo-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="deployments_desc">Most deployments</option>
              <option value="synced_desc">Last synced</option>
              <option value="recent">Recently added</option>
            </select>

            <div className="settings-repo-search-wrap">
              <span className="settings-repo-search-icon"><SearchIcon /></span>
              <input
                className="settings-repo-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search repositories..."
              />
            </div>

            <div className="settings-filter-tabs" role="tablist" aria-label="Repository filter">
              {(["all", "active", "inactive"] as FilterKey[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`settings-filter-tab ${filterKey === filter ? "active" : ""}`}
                  onClick={() => setFilterKey(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="settings-bulk-bar">
              <span>{selectedIds.length} selected</span>
              <div className="settings-bulk-actions">
                <button type="button" className="settings-btn settings-btn-secondary" onClick={() => navigate("/onboarding/repos")}>Enable all</button>
                <button type="button" className="settings-btn settings-btn-danger" onClick={() => setConfirmBulkDisable(true)}>Disable all</button>
                <button type="button" className="settings-bulk-clear" onClick={() => setSelectedIds([])}>Clear selection</button>
              </div>
            </div>
          ) : null}

          <section className="settings-list-shell">
            {filteredRepos.length === 0 ? (
              <div className="settings-empty-block">
                <RepoIcon />
                <h3>No repositories tracked</h3>
                <p>Add repositories to start monitoring deployments</p>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={() => navigate("/onboarding/repos")}
                >
                  <PlusIcon />
                  Add repositories
                </button>
              </div>
            ) : (
              filteredRepos.map((repo) => {
                const stats = repoStats[repo.id];
                const hasDeployments = (stats?.total_deployments ?? 0) > 0;
                const status = statusClass(stats?.last_deployment_status ?? null);

                return (
                  <div key={repo.id} className="settings-row settings-repo-row">
                    <input
                      type="checkbox"
                      className="settings-row-checkbox"
                      checked={selectedIds.includes(repo.id)}
                      onChange={() => toggleSelection(repo.id)}
                    />

                    <div className="settings-icon-box">
                      <RepoIcon />
                    </div>

                    <div className="settings-row-main">
                      <div className="settings-row-title">{repo.full_name ?? `${repo.owner ?? "unknown"}/${repo.name ?? "repo"}`}</div>
                      <div className="settings-row-meta">
                        <span className={`settings-tag ${repo.private ? "base" : "public"}`}>
                          {repo.private ? "Private" : "Public"}
                        </span>
                        <span className="settings-tag branch">
                          <BranchIcon />
                          {repo.default_branch}
                        </span>
                        <span className="settings-meta-text">Synced {formatRelativeTime(repo.updated_at ?? repo.added_at ?? repo.created_at)}</span>
                      </div>
                      <div className="settings-row-meta settings-row-meta-3">
                        <span className="settings-tag base">{stats?.total_deployments ?? 0} deploys</span>
                        {hasDeployments ? (
                          <span className="settings-meta-with-dot">
                            <span className={`settings-status-dot ${status}`} />
                            Last: {formatRelativeTime(stats?.last_deployment_at ?? null)}
                          </span>
                        ) : (
                          <span className="settings-meta-text">No deployments yet</span>
                        )}
                      </div>
                    </div>

                    <Tooltip content={repo.webhook_secret_exists ? "Webhook secret configured" : "Webhook secret missing"}>
                      <span className={`settings-webhook-badge ${repo.webhook_secret_exists ? "ok" : "warn"}`}>
                        {repo.webhook_secret_exists ? "Webhook set" : "No webhook"}
                      </span>
                    </Tooltip>

                    <Tooltip content="View webhook secret">
                      <button
                        type="button"
                        className="settings-icon-btn"
                        onClick={() => {
                          setSecretModalRepo(repo);
                          setSecretVisible(false);
                          setSecretValue("");
                        }}
                      >
                        <EyeIcon />
                      </button>
                    </Tooltip>

                    <Tooltip content="Sync repository">
                      <button
                        type="button"
                        className="settings-icon-btn"
                        onClick={() => void syncRepo(repo.id)}
                        disabled={Boolean(syncingByRepo[repo.id])}
                      >
                        <RefreshIcon spinning={Boolean(syncingByRepo[repo.id])} />
                      </button>
                    </Tooltip>

                    <button
                      type="button"
                      className={`settings-toggle ${repo.is_active ? "active" : "inactive"}`}
                      role="switch"
                      aria-checked={repo.is_active}
                      aria-label={repo.is_active ? `Disable ${repo.name ?? "repository"}` : `Enable ${repo.name ?? "repository"}`}
                      onClick={() => {
                        if (repo.is_active) {
                          setConfirmRepoId(repo.id);
                        } else {
                          navigate("/onboarding/repos");
                        }
                      }}
                    >
                      <span className="settings-toggle-thumb" />
                    </button>
                  </div>
                );
              })
            )}
          </section>
        </div>

        <ConfirmModal
          isOpen={Boolean(confirmRepoId)}
          title={`Disable ${repoToDisable?.name ?? "repository"}?`}
          body={"DeployLens will stop syncing deployments\nfor this repository. Existing history\nis preserved."}
          confirmLabel="Disable repository"
          confirmVariant="danger"
          onConfirm={async () => {
            if (!confirmRepoId) return;
            await handleUntrack(confirmRepoId);
            setConfirmRepoId(null);
          }}
          onCancel={() => setConfirmRepoId(null)}
        />

        <ConfirmModal
          isOpen={confirmBulkDisable}
          title={`Disable ${selectedIds.length} repositories?`}
          body={"DeployLens will stop syncing deployments\nfor selected repositories. Existing history\nis preserved."}
          confirmLabel="Disable selected"
          confirmVariant="danger"
          onConfirm={async () => {
            await bulkDisable();
            setConfirmBulkDisable(false);
          }}
          onCancel={() => setConfirmBulkDisable(false)}
        />

        {secretModalRepo ? (
          <div className="webhook-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSecretModalRepo(null)}>
            <div className="webhook-modal">
              <div className="webhook-modal-header">
                <h3>Webhook Configuration - {secretModalRepo.name}</h3>
                <button type="button" className="settings-icon-btn" onClick={() => setSecretModalRepo(null)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="webhook-modal-body">
                <div className="webhook-modal-section">
                  <label>Payload URL</label>
                  <div className="webhook-inline-field">
                    <span className="settings-webhook-url settings-mono">{`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/webhooks/github`}</span>
                    <CopyButton text={`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/webhooks/github`} />
                  </div>
                </div>

                <div className="webhook-modal-section">
                  <label>Secret</label>
                  <div className="webhook-inline-field">
                    <span className="settings-mono">{secretVisible ? secretValue : "••••••••••••••••••"}</span>
                    <button
                      type="button"
                      className="settings-icon-btn"
                      onClick={async () => {
                        try {
                          if (!secretVisible) {
                            const result = await github.getWebhookSecret(secretModalRepo.id);
                            setSecretValue(result.webhook_secret);
                            setSecretVisible(true);
                            return;
                          }

                          setSecretVisible(false);
                        } catch {
                          toast.error("Could not load webhook secret");
                        }
                      }}
                    >
                      <EyeIcon />
                    </button>
                    {secretVisible ? <CopyButton text={secretValue} /> : null}
                  </div>
                </div>

                <div className="webhook-modal-section">
                  <label>Quick setup</label>
                  <div className="settings-steps-wrap">
                    <div className="settings-step-row">
                      <span className="settings-step-number">1</span>
                      <div><div className="settings-step-title">Copy the endpoint URL above</div></div>
                    </div>
                    <div className="settings-step-row">
                      <span className="settings-step-number">2</span>
                      <div>
                        <div className="settings-step-title">Go to GitHub repo settings and add webhook</div>
                        <div className="settings-step-body">Use the repository webhook secret from this modal.</div>
                      </div>
                    </div>
                    <div className="settings-step-row">
                      <span className="settings-step-number">3</span>
                      <div>
                        <div className="settings-step-title">Select Workflow runs and application/json</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="webhook-modal-footer">
                <button type="button" className="settings-btn settings-btn-secondary" onClick={() => setSecretModalRepo(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </SettingsLayout>
    </>
  );
}
