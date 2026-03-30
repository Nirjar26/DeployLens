import { AlertCircle, Check, CheckCircle2, Github } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { github } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function ConnectGithubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryError = useMemo(() => {
    return searchParams.get("error") === "github_failed"
      ? "GitHub connection failed. Please try again."
      : null;
  }, [searchParams]);

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);

    try {
      window.location.href = github.connectUrl();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unable to start GitHub connection");
      setIsConnecting(false);
    }
  }

  async function handleRefreshStatus() {
    await handleConnect();
  }

  return (
    <section className="onboarding-step-page">
      <header className="onboarding-step-header">
        <span className="onboarding-step-badge">Step 1 of 4</span>
        <h1>Connect your GitHub account</h1>
        <p>DeployLens needs read access to your repos and Actions workflows</p>
      </header>

      <div className="onboarding-step-divider" />

      {(queryError || error) ? (
        <div className="onboarding-step-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{queryError ?? error}</span>
        </div>
      ) : null}

      {githubConnected ? (
        <>
          <div className="onboarding-github-card onboarding-github-success-card">
            <div className="onboarding-github-success-row">
              <CheckCircle2 size={24} />
              <h2>Connected to GitHub</h2>
            </div>

            <p className="onboarding-github-username">{githubUsername ? `@${githubUsername}` : "GitHub account linked"}</p>

            <button type="button" className="onboarding-github-reconnect-link" onClick={handleRefreshStatus}>
              Not the right account? Reconnect
            </button>
          </div>

          <button type="button" className="onboarding-primary-btn" onClick={() => navigate("/onboarding/repos")}>
            Continue to repos →
          </button>
        </>
      ) : (
        <div className="onboarding-github-card">
          <div className="onboarding-github-mark" aria-hidden="true">
            <Github size={40} />
          </div>

          <ul className="onboarding-github-permissions" aria-label="Requested permissions">
            <li>
              <Check size={16} />
              <span>Read access to your repositories</span>
            </li>
            <li>
              <Check size={16} />
              <span>Read GitHub Actions workflow run data</span>
            </li>
            <li>
              <Check size={16} />
              <span>Read your GitHub email address</span>
            </li>
          </ul>

          <button type="button" className="onboarding-github-connect-btn" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <span className="spinner" aria-hidden="true" /> : <Github size={18} />}
            {isConnecting ? "Connecting..." : "Connect GitHub"}
          </button>

          <p className="onboarding-github-helper">You&apos;ll be redirected to GitHub to authorize</p>
        </div>
      )}
    </section>
  );
}
