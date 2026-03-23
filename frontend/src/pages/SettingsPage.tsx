import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import EnvironmentCard from "../components/onboarding/EnvironmentCard";
import { account, audit, github } from "../lib/api";
import { setAccessToken } from "../lib/auth";
import { useAuthStore } from "../store/authStore";
import { useAwsStore } from "../store/awsStore";

function parseApiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { error?: { code?: unknown } } } })
    ?.response?.data?.error?.code;
  return typeof code === "string" ? code : null;
}

function formatAuditAction(value: string): string {
  return value.replace(/[._]/g, " ");
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsRegion = useAwsStore((state) => state.awsRegion);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);
  const disconnectAws = useAwsStore((state) => state.disconnectAws);
  const environments = useAwsStore((state) => state.environments);
  const removeEnvironment = useAwsStore((state) => state.removeEnvironment);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditAction, setAuditAction] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);

  const canDeleteAccount = useMemo(
    () => deleteConfirmText === "DELETE" && deletePassword.length > 0 && !deleteSaving,
    [deleteConfirmText, deletePassword, deleteSaving],
  );

  useEffect(() => {
    setProfileName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    setAuditLoading(true);

    void audit.list({
      action: auditAction || undefined,
      entity_type: auditEntityType || undefined,
      from: auditFrom ? new Date(`${auditFrom}T00:00:00.000Z`).toISOString() : undefined,
      to: auditTo ? new Date(`${auditTo}T23:59:59.999Z`).toISOString() : undefined,
      page: auditPage,
      limit: 20,
    }).then((response) => {
      setAuditEntries((prev) => (auditPage === 1 ? response.entries : [...prev, ...response.entries]));
      setAuditHasMore(response.pagination.hasNext);
      setAuditLoading(false);
    }).catch(() => {
      setAuditEntries((prev) => (auditPage === 1 ? [] : prev));
      setAuditHasMore(false);
      setAuditLoading(false);
    });
  }, [auditAction, auditEntityType, auditFrom, auditTo, auditPage]);

  async function handleLogout() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }

    clearAuth();
    navigate("/login", { replace: true });
  }

  async function handleUntrack(repoId: string) {
    try {
      await github.untrackRepo(repoId);
      await fetchTrackedRepos();
    } catch {
      // ignore
    }
  }

  async function handleDisconnectGithub() {
    try {
      await github.disconnect();
      await fetchTrackedRepos();
    } catch {
      // ignore
    }
  }

  async function handleSaveProfile() {
    if (!profileName.trim()) {
      setProfileError("Name is required.");
      setProfileMessage(null);
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const updated = await account.updateProfile(profileName.trim());
      updateUser({ name: updated.name });
      setProfileMessage("Profile updated.");
    } catch {
      setProfileError("Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleUpdatePassword() {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const response = await account.updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setAccessToken(response.accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (error) {
      const code = parseApiErrorCode(error);
      if (code === "WRONG_PASSWORD") {
        setPasswordError("Current password is incorrect.");
      } else if (code === "PASSWORD_MISMATCH") {
        setPasswordError("New password and confirmation do not match.");
      } else {
        setPasswordError("Could not update password.");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!canDeleteAccount) {
      return;
    }

    setDeleteSaving(true);
    setDeleteError(null);

    try {
      await account.deleteAccount(deletePassword);
      clearAuth();
      navigate("/login", { replace: true });
    } catch (error) {
      const code = parseApiErrorCode(error);
      if (code === "WRONG_PASSWORD") {
        setDeleteError("Password is incorrect.");
      } else {
        setDeleteError("Failed to delete account.");
      }
      setDeleteSaving(false);
    }
  }

  return (
    <div className="dl-dashboard-shell">
      <Sidebar onLogout={handleLogout} />

      <main className="settings-page">
        <h1>Settings</h1>

        <section className="settings-section">
        <h3>GitHub Connection</h3>
        <p>{githubConnected ? `Connected as ${githubUsername ?? "unknown"}` : "Not connected"}</p>
        <div className="settings-actions">
          <button type="button" className="auth-btn auth-btn-secondary" onClick={() => navigate("/onboarding/github")}>Reconnect GitHub</button>
          {githubConnected ? <button type="button" className="auth-btn auth-btn-secondary" onClick={() => void handleDisconnectGithub()}>Disconnect GitHub</button> : null}
        </div>
        </section>

        <section className="settings-section">
        <h3>AWS Connection</h3>
        <p>{awsConnected ? `Account ${awsAccountId} · ${awsRegion}${awsAccountAlias ? ` · ${awsAccountAlias}` : ""}` : "Not connected"}</p>
        <div className="settings-actions">
          <button type="button" className="auth-btn auth-btn-secondary" onClick={() => navigate("/onboarding/aws")}>Update credentials</button>
          {awsConnected ? <button type="button" className="auth-btn auth-btn-secondary" onClick={() => void disconnectAws()}>Disconnect</button> : null}
        </div>
        </section>

        <section className="settings-section">
        <h3>Tracked Repositories</h3>
        <div className="settings-list">
          {trackedRepos.map((repo) => (
            <div key={repo.id} className="settings-list-item">
              <div>
                <strong>{repo.full_name}</strong>
                <p>{repo.is_active ? "Active" : "Inactive"}</p>
              </div>
              <button type="button" className="link-danger" onClick={() => void handleUntrack(repo.id)}>Disable</button>
            </div>
          ))}
        </div>
        <button type="button" className="auth-btn auth-btn-secondary" onClick={() => navigate("/onboarding/repos")}>Add more repos</button>
        </section>

        <section className="settings-section">
        <h3>Environments</h3>
        <div className="env-list-wrap">
          {environments.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              onUpdate={async () => Promise.resolve()}
              onDelete={async (id) => {
                await removeEnvironment(id);
              }}
            />
          ))}
        </div>
        <button type="button" className="auth-btn auth-btn-secondary" onClick={() => navigate("/onboarding/environments")}>Add environment</button>
        </section>

        <section className="settings-section">
          <h3>Profile</h3>
          <p>{user?.email}</p>
          <div className="settings-form-grid">
            <input className="dl-filter-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            <button type="button" className="auth-btn auth-btn-primary" onClick={() => void handleSaveProfile()} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save profile"}
            </button>
          </div>
          {profileMessage ? <p className="settings-success">{profileMessage}</p> : null}
          {profileError ? <p className="settings-error">{profileError}</p> : null}
        </section>

        <section className="settings-section">
          <h3>Change Password</h3>
          <div className="settings-form-grid settings-form-stack">
            <input className="dl-filter-input" type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <input className="dl-filter-input" type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <input className="dl-filter-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <button type="button" className="auth-btn auth-btn-primary" onClick={() => void handleUpdatePassword()} disabled={passwordSaving}>
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </div>
          {passwordMessage ? <p className="settings-success">{passwordMessage}</p> : null}
          {passwordError ? <p className="settings-error">{passwordError}</p> : null}
        </section>

        <section className="settings-section settings-danger-zone">
          <h3>Delete Account</h3>
          <p>This permanently deletes your account and deployment history.</p>
          <button type="button" className="auth-btn auth-btn-secondary" onClick={() => setDeleteOpen(true)}>
            Delete account
          </button>
        </section>

        <section className="settings-section">
          <h3>Audit Log</h3>
          <div className="settings-audit-filters">
            <input className="dl-filter-input" placeholder="Action" value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(1); }} />
            <input className="dl-filter-input" placeholder="Entity type" value={auditEntityType} onChange={(event) => { setAuditEntityType(event.target.value); setAuditPage(1); }} />
            <input className="dl-filter-input" type="date" value={auditFrom} onChange={(event) => { setAuditFrom(event.target.value); setAuditPage(1); }} />
            <input className="dl-filter-input" type="date" value={auditTo} onChange={(event) => { setAuditTo(event.target.value); setAuditPage(1); }} />
          </div>

          <div className="settings-list">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="settings-list-item settings-audit-item">
                <div>
                  <strong>{formatAuditAction(entry.action)}</strong>
                  <p>{entry.entity_type} {entry.entity_id ? `(${entry.entity_id})` : ""}</p>
                </div>
                <span className="dl-cell-time" title={new Date(entry.created_at).toLocaleString()}>
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {!auditLoading && auditEntries.length === 0 ? <p>No audit entries found.</p> : null}
          </div>

          {auditHasMore ? (
            <button type="button" className="auth-btn auth-btn-secondary" onClick={() => setAuditPage((value) => value + 1)} disabled={auditLoading}>
              {auditLoading ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </section>
      </main>

      {deleteOpen ? (
        <div className="dl-modal-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="dl-modal-container" onClick={(event) => event.stopPropagation()}>
            <div className="dl-modal-header">
              <div className="dl-modal-header-center">
                <h3 className="dl-modal-title">Delete Account</h3>
                <p className="dl-cell-time">Type DELETE and enter your password to confirm.</p>
              </div>
            </div>
            <div className="dl-modal-body">
              <input className="dl-filter-input" placeholder="Type DELETE" value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
              <input className="dl-filter-input" type="password" placeholder="Password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
              {deleteError ? <p className="settings-error">{deleteError}</p> : null}
            </div>
            <div className="dl-modal-footer">
              <button type="button" className="dl-modal-close-btn" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button type="button" className="dl-modal-rollback-btn" disabled={!canDeleteAccount} onClick={() => void handleDeleteAccount()}>
                {deleteSaving ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
