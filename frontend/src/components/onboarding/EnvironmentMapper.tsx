import { AlertTriangle, Check, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aggregator } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { EnvironmentItem, useAwsStore } from "../../store/awsStore";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

type Props = {
  onLoad: () => Promise<void>;
};

export default function EnvironmentMapper({ onLoad }: Props) {
  const navigate = useNavigate();
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);

  const applications = useAwsStore((state) => state.applications);
  const environments = useAwsStore((state) => state.environments);
  const isLoadingApplications = useAwsStore((state) => state.isLoadingApplications);
  const isLoadingEnvironments = useAwsStore((state) => state.isLoadingEnvironments);
  const addEnvironment = useAwsStore((state) => state.addEnvironment);
  const removeEnvironment = useAwsStore((state) => state.removeEnvironment);

  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [deploymentGroups, setDeploymentGroups] = useState<string[]>([]);
  const [repositoryId, setRepositoryId] = useState("");
  const [appName, setAppName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [colorTag, setColorTag] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      setIsBootLoading(true);
      try {
        await Promise.all([onLoad(), fetchTrackedRepos()]);
      } finally {
        setIsBootLoading(false);
      }
    }

    void bootstrap();
  }, [fetchTrackedRepos, onLoad]);

  useEffect(() => {
    async function loadGroups() {
      if (!appName) {
        setDeploymentGroups([]);
        setGroupName("");
        setGroupError(null);
        return;
      }

      setIsGroupsLoading(true);
      setGroupError(null);
      setGroupName("");

      try {
        const { aws } = await import("../../lib/api");
        const result = await aws.getDeploymentGroups(appName);
        setDeploymentGroups(result.deploymentGroups ?? []);
      } catch {
        setDeploymentGroups([]);
        setGroupError("Failed to load deployment groups");
      } finally {
        setIsGroupsLoading(false);
      }
    }

    void loadGroups();
  }, [appName]);

  async function handleAdd() {
    setGroupError(null);
    setToastError(null);
    setToastSuccess(null);

    try {
      await addEnvironment({
        repository_id: repositoryId,
        codedeploy_app: appName,
        codedeploy_group: groupName,
        display_name: displayName,
        color_tag: colorTag,
      });

      setRepositoryId("");
      setAppName("");
      setGroupName("");
      setDisplayName("");
      setColorTag("");
      setDeploymentGroups([]);
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      if (code === "GROUP_NOT_FOUND") {
        setGroupError("Deployment group not found in your AWS account");
      } else {
        setToastError("Something went wrong. Please try again.");
      }
    }
  }

  const addDisabled = useMemo(() => {
    return !repositoryId || !appName || !groupName || !displayName.trim() || !colorTag;
  }, [appName, colorTag, displayName, groupName, repositoryId]);

  async function handleDeleteEnvironment(id: string) {
    await removeEnvironment(id);
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    setToastError(null);
    setToastSuccess(null);

    try {
      const result = await aggregator.run();
      setToastSuccess(`Sync complete — ${result.mergedCount} deployments merged`);
      await onLoad();
    } catch {
      setToastError("Sync failed, try again");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isBootLoading || isLoadingApplications || isLoadingEnvironments) {
    return (
      <section className="mapper-page">
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
      </section>
    );
  }

  return (
    <section className="mapper-page">
      <div className="env-form-card">
        <h2 className="env-form-title">Add environment</h2>

        <div className="env-form-grid-top">
          <select className="auth-input" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)}>
            <option value="">Repository</option>
            {trackedRepos.map((repo) => (
              <option key={repo.id} value={repo.id}>{repo.full_name}</option>
            ))}
          </select>

          <select className="auth-input" value={appName} onChange={(event) => setAppName(event.target.value)}>
            <option value="">CodeDeploy app</option>
            {applications.map((app) => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>

          <select className="auth-input" value={groupName} disabled={!appName || isGroupsLoading} onChange={(event) => setGroupName(event.target.value)}>
            {!appName ? <option value="">Select an app first</option> : null}
            {appName && isGroupsLoading ? <option value="">Loading groups...</option> : null}
            {appName && !isGroupsLoading && deploymentGroups.length === 0 ? <option value="">No groups found</option> : null}
            {deploymentGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div className="env-form-grid-bottom">
          <input
            className="auth-input env-name-input"
            placeholder="production"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <div className="color-swatch-group" role="radiogroup" aria-label="Environment color">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`color-swatch ${colorTag === swatch ? "color-swatch-active" : ""}`}
                style={{ backgroundColor: swatch }}
                onClick={() => setColorTag(swatch)}
                aria-pressed={colorTag === swatch}
              >
                {colorTag === swatch ? <Check size={12} /> : null}
              </button>
            ))}
          </div>

          <button type="button" className="onboarding-primary-btn onboarding-add-btn" disabled={addDisabled} onClick={handleAdd}>Add</button>
        </div>

        {applications.length === 0 ? (
          <div className="onboarding-warning-banner" role="status">
            <AlertTriangle size={14} />
            <span>No CodeDeploy apps found in your AWS account</span>
          </div>
        ) : null}
        {groupError ? <p className="field-error">{groupError}</p> : null}
      </div>

      <h3 className="env-list-title">Mapped environments ({environments.length})</h3>

      <div className="env-list-wrap">
        {environments.length === 0 ? (
          <div className="empty-env-state">
            Add your first environment using the form above
          </div>
        ) : (
          environments.map((env: EnvironmentItem) => {
            return (
              <div key={env.id} className="env-row">
                <div className="env-color-swatch" style={{ color: env.color_tag }}>
                  <span className="env-color-swatch-dot" style={{ backgroundColor: env.color_tag }} />
                </div>

                <div className="env-center">
                  <div className="env-row-main">
                    <span className="env-name">{env.display_name}</span>
                    <span className="env-repo-chip">{env.repository_full_name}</span>
                    <span className="env-arrow">→</span>
                    <span className="env-path truncate" title={`${env.codedeploy_app} / ${env.codedeploy_group}`}>
                      {env.codedeploy_app} / {env.codedeploy_group}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="env-delete-btn"
                  onClick={() => void handleDeleteEnvironment(env.id)}
                  aria-label={`Delete ${env.display_name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="repos-sticky-bar env-sticky">
        <span className={`repos-sticky-count ${environments.length === 0 ? "is-empty" : ""}`}>{environments.length} environment(s) mapped</span>
        <div className="env-sticky-actions">
          <button type="button" className="onboarding-secondary-btn" onClick={handleSyncNow} disabled={isSyncing}>
            {isSyncing ? <Loader2 size={14} className="spin-inline" /> : <RefreshCcw size={14} />}
            {isSyncing ? "Syncing..." : "Sync now"}
          </button>
          <button type="button" className="onboarding-primary-btn onboarding-primary-btn-compact" onClick={() => navigate("/dashboard")}>Go to Dashboard →</button>
        </div>
      </div>

      {toastError ? <div className="repo-toast-error">{toastError}</div> : null}
      {toastSuccess ? <div className="repo-toast-success">{toastSuccess}</div> : null}
    </section>
  );
}
