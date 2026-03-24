import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { github } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function RepositoriesPage() {
  const navigate = useNavigate();
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);

  useEffect(() => {
    void fetchTrackedRepos();
  }, [fetchTrackedRepos]);

  async function handleUntrack(repoId: string) {
    try {
      await github.untrackRepo(repoId);
      await fetchTrackedRepos();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <PageHeader
        title="Repositories"
        subtitle="Repos being monitored for deployments"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <section className="settings-section">
            <h3>Tracked Repositories</h3>
            <div className="settings-list">
              {trackedRepos.map((repo) => (
                <div key={repo.id} className="settings-list-item">
                  <div>
                    <strong>{repo.full_name}</strong>
                    <p>{repo.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => void handleUntrack(repo.id)}
                  >
                    Disable
                  </button>
                </div>
              ))}
              {trackedRepos.length === 0 ? <p>No repositories tracked yet.</p> : null}
            </div>
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              onClick={() => navigate("/onboarding/repos")}
            >
              Add more repos
            </button>
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
