import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { github } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);

  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsRegion = useAwsStore((state) => state.awsRegion);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);
  const disconnectAws = useAwsStore((state) => state.disconnectAws);
  const fetchAwsStatus = useAwsStore((state) => state.fetchAwsStatus);

  useEffect(() => {
    void fetchTrackedRepos();
    void fetchAwsStatus();
  }, [fetchAwsStatus, fetchTrackedRepos]);

  async function handleDisconnectGithub() {
    try {
      await github.disconnect();
      await fetchTrackedRepos();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Manage your GitHub and AWS connections"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0", display: "grid", gap: "16px" }}>
          <section className="settings-section">
            <h3>GitHub Connection</h3>
            <p>{githubConnected ? `Connected as ${githubUsername ?? "unknown"}` : "Not connected"}</p>
            <div className="settings-actions">
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => navigate("/onboarding/github")}
              >
                Reconnect GitHub
              </button>
              {githubConnected ? (
                <button
                  type="button"
                  className="auth-btn auth-btn-secondary"
                  onClick={() => void handleDisconnectGithub()}
                >
                  Disconnect GitHub
                </button>
              ) : null}
            </div>
          </section>

          <section className="settings-section">
            <h3>AWS Connection</h3>
            <p>
              {awsConnected
                ? `Account ${awsAccountId} · ${awsRegion}${awsAccountAlias ? ` · ${awsAccountAlias}` : ""}`
                : "Not connected"}
            </p>
            <div className="settings-actions">
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => navigate("/onboarding/aws")}
              >
                Update credentials
              </button>
              {awsConnected ? (
                <button
                  type="button"
                  className="auth-btn auth-btn-secondary"
                  onClick={() => void disconnectAws()}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
