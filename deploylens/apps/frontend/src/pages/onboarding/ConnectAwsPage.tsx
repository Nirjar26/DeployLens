import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AwsCredentialForm from "../../components/onboarding/AwsCredentialForm";
import { useAwsStore } from "../../store/awsStore";

function AwsCubeLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 8 18v28l24 12 24-12V18L32 6Z" fill="#f59e0b" />
      <path d="M32 6v52" stroke="#fff" strokeWidth="2" opacity="0.45" />
      <path d="M8 18 32 30l24-12" stroke="#fff" strokeWidth="2" opacity="0.45" fill="none" />
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
      <section className="onboarding-card aws-connect-card">
        <div className="repo-skeleton" />
        <div className="repo-skeleton" />
      </section>
    );
  }

  return (
    <section className="onboarding-card aws-connect-card">
      {topError ? <div className="form-error-banner">{topError}</div> : null}

      <div className="connect-hero">
        <AwsCubeLogo />
        <h1>Connect your AWS account</h1>
        <p>DeployLens needs read-only access to CodeDeploy</p>
      </div>

      <div className="iam-box">
        <div className="iam-title">Required IAM permissions</div>
        <pre>
{`codedeploy:ListApplications
codedeploy:ListDeploymentGroups
codedeploy:ListDeployments
codedeploy:GetDeployment
codedeploy:GetDeploymentGroup
codedeploy:CreateDeployment
sts:GetCallerIdentity`}
        </pre>
        <span className="iam-link">How to create an IAM user →</span>
      </div>

      {awsConnected ? (
        <div className="aws-connected-state">
          <span className="connected-badge"><CheckCircle2 size={14} /> Connected</span>
          <p>Account: {awsAccountId}</p>
          <p>Region: {awsRegion}</p>
          {awsAccountAlias ? <p>Alias: {awsAccountAlias}</p> : null}
          <button type="button" className="link-danger" onClick={handleDisconnect}>Disconnect</button>
          <button type="button" className="auth-btn auth-btn-primary" onClick={() => navigate("/onboarding/environments")}>Continue →</button>
        </div>
      ) : (
        <AwsCredentialForm isSubmitting={isConnecting} regionError={regionError} onSubmit={handleConnect} />
      )}
    </section>
  );
}
