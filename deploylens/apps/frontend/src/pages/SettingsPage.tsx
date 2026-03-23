import { useNavigate } from "react-router-dom";
import EnvironmentCard from "../components/onboarding/EnvironmentCard";
import { github } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useAwsStore } from "../store/awsStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsRegion = useAwsStore((state) => state.awsRegion);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);
  const disconnectAws = useAwsStore((state) => state.disconnectAws);
  const environments = useAwsStore((state) => state.environments);
  const removeEnvironment = useAwsStore((state) => state.removeEnvironment);

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

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h3>GitHub Connection</h3>
        <p>{githubConnected ? `Connected as ${githubUsername ?? "unknown"}` : "Not connected"}</p>
        <button type="button" className="auth-btn auth-btn-secondary" onClick={() => navigate("/onboarding/github")}>Reconnect GitHub</button>
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
        <h3>Account</h3>
        <p>{user?.name}</p>
        <p>{user?.email}</p>
        <button type="button" className="auth-btn auth-btn-primary" onClick={handleLogout}>Log out</button>
      </section>
    </div>
  );
}
