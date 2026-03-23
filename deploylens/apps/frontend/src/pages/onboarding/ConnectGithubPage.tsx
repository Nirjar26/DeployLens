import { Check, Github } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { github } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function ConnectGithubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);
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
    <section className="onboarding-card">
      {(queryError || error) ? <div className="form-error-banner">{queryError ?? error}</div> : null}

      <div className="connect-hero">
        <Github size={30} />
        <h1>Connect your GitHub account</h1>
        <p>DeployLens needs read access to your repos and Actions workflows.</p>
      </div>

      <ul className="permission-list">
        <li>
          <Check size={14} />
          Read access to repositories
        </li>
        <li>
          <Check size={14} />
          Read access to Actions workflow runs
        </li>
        <li>
          <Check size={14} />
          Read your email address
        </li>
      </ul>

      {githubConnected ? (
        <div className="github-connected-wrap">
          <span className="connected-badge">Connected {githubUsername ? `as ${githubUsername}` : ""}</span>
          <button type="button" className="link-button" onClick={handleRefreshStatus}>
            Reconnect
          </button>
          <button type="button" className="auth-btn auth-btn-primary" onClick={() => navigate("/onboarding/repos")}>Continue</button>
        </div>
      ) : (
        <>
          <button type="button" className="auth-btn github-connect-btn" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <span className="spinner" aria-hidden="true" /> : <Github size={16} />}
            {isConnecting ? "Connecting..." : "Connect GitHub"}
          </button>
          <p className="helper-copy">You&apos;ll be redirected to GitHub to authorize</p>
        </>
      )}
    </section>
  );
}
