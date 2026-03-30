import { AlertCircle, CheckCircle2, Lock, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AwsCredentialForm from "../../components/onboarding/AwsCredentialForm";
import { useAwsStore } from "../../store/awsStore";

function AwsCubeLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 8 18v28l24 12 24-12V18L32 6Z" fill="var(--aws-icon)" />
      <path d="M32 6v52" stroke="var(--text-on-accent)" strokeWidth="2" opacity="0.45" />
      <path d="M8 18 32 30l24-12" stroke="var(--text-on-accent)" strokeWidth="2" opacity="0.45" fill="none" />
    </svg>
  );
}

export default function ConnectAwsPage() {
  const navigate = useNavigate();
  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsRegion = useAwsStore((state) => state.awsRegion);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);
  const isConnecting = useAwsStore((state) => state.isConnecting);
  const connectAws = useAwsStore((state) => state.connectAws);
  const disconnectAws = useAwsStore((state) => state.disconnectAws);
  const fetchAwsStatus = useAwsStore((state) => state.fetchAwsStatus);

  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      try {
        await fetchAwsStatus();
      } finally {
        setLoading(false);
      }
    }

    void loadStatus();
  }, [fetchAwsStatus]);

  const topError = useMemo(() => {
    if (!errorCode) return null;
    if (errorCode === "AWS_INVALID_CREDENTIALS") {
      return "Could not validate these credentials. Check your Access Key ID and Secret.";
    }
    return "Something went wrong. Please try again.";
  }, [errorCode]);

  async function handleConnect(payload: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    accountAlias?: string;
  }) {
    setErrorCode(null);
    setRegionError(null);

    try {
      await connectAws(payload);
    } catch (error: any) {
      const firstValidationIssue = error?.response?.data?.error?.details?.[0];
      if (firstValidationIssue?.path === "region") {
        setRegionError(firstValidationIssue.message);
      }

      setErrorCode(error?.response?.data?.error?.code ?? "UNKNOWN");
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm("Disconnect this AWS account?");
    if (!confirmed) return;
    await disconnectAws();
  }

  if (loading) {
    return (
      <section className="onboarding-step-page onboarding-aws-page">
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
      </section>
    );
  }

  return (
    <section className="onboarding-step-page onboarding-aws-page">
      <header className="onboarding-step-header">
        <span className="onboarding-step-badge">Step 3 of 4</span>
        <h1>Connect your AWS account</h1>
        <p>DeployLens needs read-only access to CodeDeploy resources</p>
      </header>

      <div className="onboarding-step-divider" />

      {topError ? (
        <div className="onboarding-step-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{topError}</span>
        </div>
      ) : null}

      {awsConnected ? (
        <>
          <div className="onboarding-aws-success-card">
            <div className="onboarding-aws-success-row">
              <CheckCircle2 size={28} />
              <h2>AWS account connected</h2>
            </div>

            <div className="onboarding-aws-kv-grid">
              <div>
                <span>Account ID</span>
                <strong className="font-mono">{awsAccountId || "—"}</strong>
              </div>
              <div>
                <span>Region</span>
                <strong>{awsRegion || "—"}</strong>
              </div>
              <div>
                <span>Alias</span>
                <strong>{awsAccountAlias || "Not set"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong className="onboarding-aws-kv-status">Credentials valid</strong>
              </div>
            </div>

            <div className="onboarding-aws-success-actions">
              <button type="button" className="onboarding-aws-disconnect-btn" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </div>

          <button type="button" className="onboarding-primary-btn" onClick={() => navigate("/onboarding/environments")}>
            Continue to environments →
          </button>
        </>
      ) : (
        <div className="onboarding-aws-card">
          <div className="onboarding-aws-icon-wrap" aria-hidden="true">
            <AwsCubeLogo />
          </div>

          <div className="onboarding-iam-box">
            <div className="onboarding-iam-title">
              <Shield size={13} />
              <span>Required IAM permissions</span>
            </div>

            <div className="onboarding-iam-grid">
              <span>codedeploy:ListApplications</span>
              <span>codedeploy:ListDeploymentGroups</span>
              <span>codedeploy:ListDeployments</span>
              <span>codedeploy:GetDeployment</span>
              <span>codedeploy:GetDeploymentGroup</span>
              <span>codedeploy:CreateDeployment</span>
              <span>sts:GetCallerIdentity</span>
            </div>

            <a className="onboarding-iam-link" href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html" target="_blank" rel="noreferrer">
              How to create an IAM user →
            </a>
          </div>

          <AwsCredentialForm isSubmitting={isConnecting} regionError={regionError} onSubmit={handleConnect} />

          <p className="onboarding-aws-privacy-note">
            <Lock size={10} />
            Credentials encrypted with AES-256-GCM before storage
          </p>
        </div>
      )}
    </section>
  );
}
