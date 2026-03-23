import { Boxes, Check, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aggregator } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { EnvironmentItem, useAwsStore } from "../../store/awsStore";
import EnvironmentCard from "./EnvironmentCard";

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
  const updateEnvironment = useAwsStore((state) => state.updateEnvironment);
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

  async function handleUpdateEnvironment(id: string, payload: { display_name?: string; color_tag?: string }) {
    await updateEnvironment(id, payload);
  }

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
      <section className="onboarding-card mapper-page">
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
      </section>
    );
  }

  return (
    <section className="mapper-page">
      <header className="repos-header">
        <h1>Map your environments</h1>
        <p>Link CodeDeploy deployment groups to friendly environment names</p>
      </header>

      <div className="env-form-card">
        <div className="env-form-grid">
          <select className="auth-input" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)}>
            <option value="">Repository</option>
            {trackedRepos.map((repo) => (
              <option key={repo.id} value={repo.id}>{repo.full_name}</option>
            ))}
          </select>

          <select className="auth-input" value={appName} onChange={(event) => setAppName(event.target.value)}>
            <option value="">CodeDeploy App</option>
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

          <input
            className="auth-input"
            placeholder="production"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <div className="color-swatch-group">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`color-swatch ${colorTag === swatch ? "color-swatch-active" : ""}`}
                style={{ backgroundColor: swatch }}
                onClick={() => setColorTag(swatch)}
              >
                {colorTag === swatch ? <Check size={12} /> : null}
              </button>
            ))}
          </div>

          <button type="button" className="auth-btn auth-btn-primary" disabled={addDisabled} onClick={handleAdd}>Add</button>
        </div>

        {applications.length === 0 ? <p className="helper-copy helper-left">No CodeDeploy apps found in your AWS account</p> : null}
        {groupError ? <p className="field-error">{groupError}</p> : null}
      </div>

      <div className="env-list-wrap">
        {environments.length === 0 ? (
          <div className="empty-env-state">
            <Boxes size={22} />
            <h3>No environments mapped yet</h3>
            <p>Add your first one using the form above</p>
          </div>
        ) : (
          environments.map((env: EnvironmentItem) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              onUpdate={handleUpdateEnvironment}
              onDelete={handleDeleteEnvironment}
            />
          ))
        )}
      </div>

      <div className="repos-sticky-bar env-sticky">
        <span>{environments.length} environment(s) mapped</span>
        <div className="env-sticky-actions">
          <button type="button" className="auth-btn auth-btn-secondary" onClick={handleSyncNow} disabled={isSyncing}>
            <RefreshCcw size={14} className={isSyncing ? "spin-inline" : ""} />
            {isSyncing ? "Syncing..." : "Sync now"}
          </button>
          <button type="button" className="auth-btn auth-btn-primary" onClick={() => navigate("/dashboard")}>Go to Dashboard →</button>
        </div>
      </div>

      {toastError ? <div className="repo-toast-error">{toastError}</div> : null}
      {toastSuccess ? <div className="repo-toast-success">{toastSuccess}</div> : null}
    </section>
  );
}
