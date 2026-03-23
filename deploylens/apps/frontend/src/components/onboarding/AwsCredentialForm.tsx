import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const REGION_OPTIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
];

type Props = {
  isSubmitting: boolean;
  regionError?: string | null;
  onSubmit: (payload: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    accountAlias?: string;
  }) => Promise<void>;
};

export default function AwsCredentialForm({ isSubmitting, regionError, onSubmit }: Props) {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("");
  const [accountAlias, setAccountAlias] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      accessKeyId,
      secretAccessKey,
      region,
      accountAlias: accountAlias.trim() ? accountAlias.trim() : undefined,
    });
  }

  return (
    <form className="aws-form" onSubmit={handleSubmit}>
      <label className="auth-label" htmlFor="aws-access-key">AWS Access Key ID</label>
      <input
        id="aws-access-key"
        className="auth-input aws-mono"
        placeholder="AKIAIOSFODNN7EXAMPLE"
        autoComplete="off"
        value={accessKeyId}
        disabled={isSubmitting}
        onChange={(event) => setAccessKeyId(event.target.value)}
      />

      <label className="auth-label" htmlFor="aws-secret-key">AWS Secret Access Key</label>
      <div className="auth-input-shell">
        <input
          id="aws-secret-key"
          className="auth-input aws-mono"
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          autoComplete="new-password"
          type={showSecret ? "text" : "password"}
          value={secretAccessKey}
          disabled={isSubmitting}
          onChange={(event) => setSecretAccessKey(event.target.value)}
        />
        <div className="auth-input-right">
          <button
            type="button"
            className="ghost-icon-btn"
            onClick={() => setShowSecret((value) => !value)}
            tabIndex={-1}
            disabled={isSubmitting}
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <label className="auth-label" htmlFor="aws-region">AWS Region</label>
      <select
        id="aws-region"
        className={`auth-input ${regionError ? "auth-input-error" : ""}`}
        value={region}
        disabled={isSubmitting}
        onChange={(event) => setRegion(event.target.value)}
      >
        <option value="">Select a region</option>
        {REGION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value} - {option.label}
          </option>
        ))}
      </select>
      {regionError ? <p className="field-error">{regionError}</p> : null}

      <label className="auth-label" htmlFor="aws-alias">Account alias (optional)</label>
      <input
        id="aws-alias"
        className="auth-input"
        placeholder="my-startup-prod"
        value={accountAlias}
        disabled={isSubmitting}
        onChange={(event) => setAccountAlias(event.target.value)}
      />
      <p className="helper-copy helper-left">A friendly name for this AWS account</p>

      <button type="submit" className="auth-btn auth-btn-primary" disabled={isSubmitting}>
        {isSubmitting ? <span className="spinner" aria-hidden="true" /> : null}
        {isSubmitting ? "Validating credentials..." : "Validate & Connect"}
      </button>

      <p className="helper-copy">Credentials are AES-256 encrypted before storage</p>
    </form>
  );
}
