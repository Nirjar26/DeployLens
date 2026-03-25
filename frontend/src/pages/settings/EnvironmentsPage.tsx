import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { EnvironmentStats, environments as environmentsApi } from "../../lib/api";
import { useAwsStore } from "../../store/awsStore";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Tooltip from "../../components/shared/Tooltip";
import { useToast } from "../../hooks/useToast";

type SwatchOption = {
  token: string;
  value: string;
};

type TestState = {
  loading?: boolean;
  valid?: boolean;
  message?: string;
};

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a.75.75 0 01.75.75v5h5a.75.75 0 010 1.5h-5v5a.75.75 0 01-1.5 0v-5h-5a.75.75 0 010-1.5h5v-5A.75.75 0 018 1.5z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.25L2.75 20.5h18.5L12 3.25zm0 5.75a1 1 0 011 1v4.25a1 1 0 11-2 0V10a1 1 0 011-1zm0 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0012 18z" />
    </svg>
  );
}

function LayerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1L1.5 4v2L8 9l6.5-3V4L8 1zm0 10L1.5 8v2L8 13l6.5-3V8L8 11z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.7 1.3a1 1 0 011.4 0l1.6 1.6a1 1 0 010 1.4l-7.6 7.6-3.6.8.8-3.6 7.4-7.8zm-6.2 8.2l-.3 1.4 1.4-.3 6.8-6.8-1.1-1.1-6.8 6.8z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 2.5A1.5 1.5 0 016.5 1h7A1.5 1.5 0 0115 2.5v8a1.5 1.5 0 01-1.5 1.5H12V10h1.5v-8h-7V3H5V2.5z" />
      <path d="M2.5 4A1.5 1.5 0 001 5.5v8A1.5 1.5 0 002.5 15h7A1.5 1.5 0 0011 13.5v-8A1.5 1.5 0 009.5 4h-7zm0 1.5h7v8h-7v-8z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6 1.5h4l.6 1H14v1.5H2V2.5h3.4l.6-1zM3.5 5h9l-.7 8.2a1.5 1.5 0 01-1.5 1.3H5.7a1.5 1.5 0 01-1.5-1.3L3.5 5z" />
    </svg>
  );
}

function TestIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 4h2.2A3.8 3.8 0 018 2v1.6A2.2 2.2 0 005.8 5.8H2V4zm12 0v1.8h-3.8A2.2 2.2 0 008 3.6V2a3.8 3.8 0 013.8 2H14zm-8 7A2.2 2.2 0 008 12.4V14a3.8 3.8 0 01-3.8-2H2v-1.6h3.8zm8 0V12h-2.2A3.8 3.8 0 018 14v-1.6A2.2 2.2 0 0010.2 10H14z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.85 3.65a.75.75 0 00-1.06-1.06L6.5 8.88 3.2 5.58a.75.75 0 10-1.06 1.06l3.83 3.83a.75.75 0 001.06 0l6.82-6.82z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 111.06 1.06L9.06 8l2.72 2.72a.75.75 0 01-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 01-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

function getTokenColor(tokenName: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return "var(--accent-light)";
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function statusClass(value: string): "success" | "failed" | "running" | "pending" {
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

export default function EnvironmentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const environments = useAwsStore((state) => state.environments);
  const fetchEnvironments = useAwsStore((state) => state.fetchEnvironments);
  const awsConnected = useAwsStore((state) => state.awsConnected);
  const removeEnvironment = useAwsStore((state) => state.removeEnvironment);
  const updateEnvironment = useAwsStore((state) => state.updateEnvironment);
  const addEnvironment = useAwsStore((state) => state.addEnvironment);

  const [statsByEnvironment, setStatsByEnvironment] = useState<Record<string, EnvironmentStats>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [testState, setTestState] = useState<Record<string, TestState>>({});

  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateGroup, setDuplicateGroup] = useState("");
  const [duplicateColor, setDuplicateColor] = useState("");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [creatingDuplicate, setCreatingDuplicate] = useState(false);

  const swatches: SwatchOption[] = useMemo(() => {
    const tokens = [
      "--env-swatch-red",
      "--env-swatch-orange",
      "--env-swatch-yellow",
      "--env-swatch-green",
      "--env-swatch-blue",
      "--env-swatch-purple",
    ];
    return tokens.map((token) => ({ token, value: getTokenColor(token) }));
  }, []);

  useEffect(() => {
    async function load() {
      if (!awsConnected) return;
      try {
        await fetchEnvironments();
        const stats = await environmentsApi.stats();
        const map = stats.reduce<Record<string, EnvironmentStats>>((acc, item) => {
          acc[item.environment_id] = item;
          return acc;
        }, {});
        setStatsByEnvironment(map);
      } catch {
        setStatsByEnvironment({});
      }
    }

    void load();
  }, [awsConnected, fetchEnvironments]);

  function startEdit(id: string, displayName: string, colorTag: string) {
    setEditingId(id);
    setEditName(displayName);
    setEditColor(colorTag);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      await updateEnvironment(editingId, {
        display_name: editName.trim(),
        color_tag: editColor,
      });
      cancelEdit();
      toast.success("Environment updated");
    } catch {
      setEditError("Failed to save - try again");
    } finally {
      setSavingEdit(false);
    }
  }

  async function testConnection(environmentId: string) {
    try {
      setTestState((current) => ({ ...current, [environmentId]: { loading: true } }));
      const result = await environmentsApi.test(environmentId);
      setTestState((current) => ({
        ...current,
        [environmentId]: {
          loading: false,
          valid: result.valid,
          message: result.message,
        },
      }));

      window.setTimeout(() => {
        setTestState((current) => {
          const next = { ...current };
          delete next[environmentId];
          return next;
        });
      }, 5000);
    } catch {
      setTestState((current) => ({
        ...current,
        [environmentId]: {
          loading: false,
          valid: false,
          message: "Connection test failed",
        },
      }));
    }
  }

  const environmentCount = environments.length;
  const deletingEnvironment = environments.find((env) => env.id === confirmDeleteId);

  const summaryRows = useMemo(() => environments.slice(0, 4), [environments]);
  const failedSummaryCount = environments.filter((env) => statusClass(statsByEnvironment[env.id]?.last_deployment_status ?? "pending") === "failed").length;

  const duplicateSource = environments.find((env) => env.id === duplicateSourceId) ?? null;

  function openDuplicate(id: string) {
    const source = environments.find((env) => env.id === id);
    if (!source) return;
    setDuplicateSourceId(id);
    setDuplicateName(`${source.display_name} (copy)`);
    setDuplicateGroup("");
    const nextColor = swatches.find((swatch) => swatch.value !== source.color_tag)?.value ?? source.color_tag;
    setDuplicateColor(nextColor);
    setDuplicateError(null);
  }

  async function createDuplicate() {
    if (!duplicateSource) return;
    if (!duplicateName.trim() || !duplicateGroup.trim()) {
      setDuplicateError("Display name and deployment group are required");
      return;
    }

    if (duplicateGroup.trim() === duplicateSource.codedeploy_group) {
      setDuplicateError("Deployment group must be different from original");
      return;
    }

    try {
      setCreatingDuplicate(true);
      setDuplicateError(null);
      await addEnvironment({
        repository_id: duplicateSource.repository_id,
        codedeploy_app: duplicateSource.codedeploy_app,
        codedeploy_group: duplicateGroup.trim(),
        display_name: duplicateName.trim(),
        color_tag: duplicateColor,
      });
      await fetchEnvironments();
      const stats = await environmentsApi.stats();
      const map = stats.reduce<Record<string, EnvironmentStats>>((acc, item) => {
        acc[item.environment_id] = item;
        return acc;
      }, {});
      setStatsByEnvironment(map);
      setDuplicateSourceId(null);
      toast.success("Environment duplicated");
    } catch (error: unknown) {
      const message = typeof error === "object" && error && "response" in error
        ? String((error as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code ?? "")
        : "";
      if (message === "GROUP_NOT_FOUND") {
        setDuplicateError("Deployment group not found in AWS");
      } else {
        setDuplicateError("Failed to create duplicate environment");
      }
    } finally {
      setCreatingDuplicate(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Environments"
        subtitle="CodeDeploy group mappings"
        actions={(
          <button
            type="button"
            className="settings-btn settings-btn-primary settings-toolbar-btn"
            onClick={() => navigate("/onboarding/environments")}
          >
            <PlusIcon />
            Add environment
          </button>
        )}
      />
      <SettingsLayout maxWidth="980px">
        <div className="settings-config-wrap">
          {!awsConnected ? (
            <div className="settings-warning-card">
              <WarningIcon />
              <div style={{ flex: 1 }}>
                <div className="settings-warning-title">AWS not connected</div>
                <div className="settings-warning-body">Connect your AWS account to manage environment mappings</div>
              </div>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={() => navigate("/onboarding/aws")}
              >
                Connect AWS
              </button>
            </div>
          ) : null}

          {awsConnected && environmentCount > 0 ? (
            <div className="settings-env-summary-bar">
              <div className="settings-env-summary-list">
                {summaryRows.map((env) => {
                  const stats = statsByEnvironment[env.id];
                  const status = statusClass(stats?.last_deployment_status ?? "pending");
                  return (
                    <div key={env.id} className="settings-env-summary-chip">
                      <span className="settings-env-summary-color" style={{ background: env.color_tag }} />
                      <span className="settings-env-summary-name">{env.display_name}</span>
                      <span className={`settings-env-summary-status ${status}`}>{stats?.last_deployment_status ?? "pending"}</span>
                      <span className="settings-env-summary-time">{formatRelativeTime(stats?.last_deployment_at ?? null)}</span>
                    </div>
                  );
                })}
                {environmentCount > 4 ? <span className="settings-env-summary-more">+{environmentCount - 4} more</span> : null}
              </div>
              <div className="settings-env-summary-health">
                <span className={`settings-status-dot ${failedSummaryCount > 0 ? "failed" : "success"}`} />
                <span>
                  {failedSummaryCount > 0
                    ? `${failedSummaryCount} environments with recent failures`
                    : "All systems operational"}
                </span>
              </div>
            </div>
          ) : null}

          {awsConnected ? (
            <>
              <div className="settings-stat-row">
                <div className="settings-stat-chip">
                  <span className="settings-stat-dot active" aria-hidden="true" />
                  <span className="settings-stat-number">{environmentCount}</span>
                  <span className="settings-stat-label">Environments configured</span>
                </div>
              </div>

              <section className="settings-list-shell">
                {environmentCount === 0 ? (
                  <div className="settings-empty-block">
                    <LayerIcon size={32} />
                    <h3>No environments configured</h3>
                    <p>Map your CodeDeploy groups to environment names</p>
                    <button
                      type="button"
                      className="settings-btn settings-btn-primary"
                      onClick={() => navigate("/onboarding/environments")}
                    >
                      <PlusIcon />
                      Add environment
                    </button>
                  </div>
                ) : (
                  environments.map((env) => {
                    const stats = statsByEnvironment[env.id];
                    const isEditing = editingId === env.id;
                    const activeColor = isEditing ? editColor : env.color_tag;
                    const currentTest = testState[env.id];

                    return (
                      <div key={env.id} className={`settings-row ${isEditing ? "settings-env-edit" : ""}`}>
                        {!isEditing ? (
                          <>
                            <div
                              className="settings-env-color-box"
                              style={{
                                background: hexToRgba(activeColor, 0.15),
                                borderColor: activeColor,
                              }}
                            >
                              <span className="settings-env-color-dot" style={{ background: activeColor }} />
                            </div>

                            <div className="settings-row-main">
                              <div className="settings-row-title" style={{ textTransform: "capitalize", fontWeight: 700 }}>
                                {env.display_name}
                              </div>
                              <div className="settings-row-meta">
                                <span className="settings-tag base">{(env.repository_full_name || "unknown/repo").split("/").pop() || env.repository_full_name || "unknown/repo"}</span>
                                <span className="settings-meta-text">→</span>
                                <span className="settings-env-path">
                                  {env.codedeploy_app || "app"} / {env.codedeploy_group || "group"}
                                </span>
                              </div>
                              <div className="settings-row-meta settings-row-meta-3">
                                <span className="settings-tag base">{stats?.total_deployments ?? 0} deploys</span>
                                {stats?.last_deployment_at ? (
                                  <span className="settings-meta-with-dot">
                                    <span className={`settings-status-dot ${statusClass(stats.last_deployment_status ?? "pending")}`} />
                                    Last: {formatRelativeTime(stats.last_deployment_at)}
                                  </span>
                                ) : (
                                  <span className="settings-meta-text">No deployments yet</span>
                                )}
                                <span className="settings-meta-text">Last 5:</span>
                                <div className="settings-health-dots">
                                  {Array.from({ length: 5 }).map((_, index) => {
                                    const status = stats?.recent_statuses?.[index];
                                    if (!status) {
                                      return <span key={index} className="settings-status-dot empty" />;
                                    }

                                    return (
                                      <Tooltip key={index} content={status}>
                                        <span className={`settings-status-dot ${statusClass(status)}`} />
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </div>
                              {currentTest && !currentTest.loading && currentTest.valid === false ? (
                                <div className="settings-row-footer-error">{currentTest.message}</div>
                              ) : null}
                            </div>

                            <div className="settings-actions-right">
                              <Tooltip content={currentTest?.message ?? "Test AWS connection"}>
                                <button
                                  type="button"
                                  className="settings-icon-btn"
                                  onClick={() => void testConnection(env.id)}
                                  disabled={Boolean(currentTest?.loading)}
                                >
                                  {currentTest?.loading ? <span className="settings-spinner" /> : null}
                                  {!currentTest?.loading && currentTest?.valid === true ? <CheckIcon /> : null}
                                  {!currentTest?.loading && currentTest?.valid === false ? <XIcon /> : null}
                                  {!currentTest?.loading && currentTest?.valid === undefined ? <TestIcon /> : null}
                                </button>
                              </Tooltip>
                              <button
                                type="button"
                                className="settings-icon-btn"
                                onClick={() => startEdit(env.id, env.display_name, env.color_tag)}
                                aria-label={`Edit ${env.display_name}`}
                              >
                                <PencilIcon />
                              </button>
                              <Tooltip content="Duplicate environment">
                                <button
                                  type="button"
                                  className="settings-icon-btn"
                                  onClick={() => openDuplicate(env.id)}
                                  aria-label={`Duplicate ${env.display_name}`}
                                >
                                  <CopyIcon />
                                </button>
                              </Tooltip>
                              <button
                                type="button"
                                className="settings-icon-btn settings-icon-btn-danger"
                                onClick={() => setConfirmDeleteId(env.id)}
                                aria-label={`Delete ${env.display_name}`}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              className="settings-env-input"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              aria-label="Environment name"
                            />

                            <div className="settings-swatches">
                              <span className="settings-swatches-label">Color:</span>
                              {swatches.map((swatch) => (
                                <button
                                  key={swatch.token}
                                  type="button"
                                  className={`settings-swatch-btn ${editColor === swatch.value ? "selected" : ""}`}
                                  style={{ background: `var(${swatch.token})` }}
                                  onClick={() => setEditColor(swatch.value)}
                                  aria-label={`Choose ${swatch.token.replace("--env-swatch-", "")} color`}
                                />
                              ))}
                            </div>

                            <div className="settings-actions-right">
                              <button
                                type="button"
                                className="settings-btn settings-btn-primary"
                                onClick={() => void handleSaveEdit()}
                                disabled={savingEdit}
                              >
                                {savingEdit ? (
                                  <>
                                    <span className="settings-spinner" aria-hidden="true" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save"
                                )}
                              </button>
                              <button
                                type="button"
                                className="settings-btn settings-btn-secondary"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                              >
                                Cancel
                              </button>
                            </div>

                            {editError ? <div className="settings-row-footer-error">{editError}</div> : null}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            </>
          ) : (
            <section className="settings-list-shell">
              <div className="settings-empty-block">
                <LayerIcon size={32} />
                <h3>No environments configured</h3>
                <p>Connect AWS to start creating environment mappings</p>
              </div>
            </section>
          )}
        </div>

        <ConfirmModal
          isOpen={Boolean(confirmDeleteId)}
          title={`Delete ${deletingEnvironment?.display_name ?? "this"} environment?`}
          body={"This mapping will be removed. Existing deployments\nlinked to this environment will remain but\nshow as unassigned."}
          confirmLabel="Delete environment"
          confirmVariant="danger"
          onConfirm={async () => {
            if (!confirmDeleteId) return;
            await removeEnvironment(confirmDeleteId);
            if (editingId === confirmDeleteId) {
              cancelEdit();
            }
            setConfirmDeleteId(null);
            toast.info("Environment deleted");
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />

        {duplicateSource ? (
          <div className="webhook-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setDuplicateSourceId(null)}>
            <div className="webhook-modal webhook-modal-md">
              <div className="webhook-modal-header">
                <h3>Duplicate {duplicateSource.display_name}</h3>
              </div>
              <div className="webhook-modal-body">
                <p className="settings-step-body">Creates a new environment with the same repository and CodeDeploy app but a different deployment group.</p>

                <div className="webhook-modal-section">
                  <label>Display name</label>
                  <input className="settings-env-input" value={duplicateName} onChange={(event) => setDuplicateName(event.target.value)} />
                </div>

                <div className="webhook-modal-section">
                  <label>Deployment group</label>
                  <input
                    className="settings-env-input"
                    value={duplicateGroup}
                    onChange={(event) => setDuplicateGroup(event.target.value)}
                    placeholder="Enter new deployment group name"
                    style={{ width: "100%" }}
                  />
                  <div className="settings-step-body">Must be a different group from the original</div>
                </div>

                <div className="webhook-modal-section">
                  <label>Color</label>
                  <div className="settings-swatches">
                    {swatches.map((swatch) => (
                      <button
                        key={swatch.token}
                        type="button"
                        className={`settings-swatch-btn ${duplicateColor === swatch.value ? "selected" : ""}`}
                        style={{ background: `var(${swatch.token})` }}
                        onClick={() => setDuplicateColor(swatch.value)}
                      />
                    ))}
                  </div>
                </div>

                {duplicateError ? <div className="settings-row-footer-error">{duplicateError}</div> : null}
              </div>
              <div className="webhook-modal-footer">
                <button type="button" className="settings-btn settings-btn-secondary" onClick={() => setDuplicateSourceId(null)}>
                  Cancel
                </button>
                <button type="button" className="settings-btn settings-btn-primary" onClick={() => void createDuplicate()} disabled={creatingDuplicate}>
                  {creatingDuplicate ? "Creating..." : "Create environment"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SettingsLayout>
    </>
  );
}
