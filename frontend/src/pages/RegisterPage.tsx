import { CSSProperties } from "react";
import { Eye, EyeOff, Github } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthButton from "../components/auth/AuthButton";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import { useAuthStore } from "../store/authStore";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

type FieldKey = keyof FieldErrors;

function isFieldKey(path: unknown): path is FieldKey {
  return path === "name" || path === "email" || path === "password";
}

function parseApiError(error: any): { topError?: string; fields: FieldErrors } {
  const details = error?.response?.data?.error?.details;

  if (Array.isArray(details)) {
    const fields: FieldErrors = {};
    for (const detail of details) {
      const path: unknown = detail?.path;
      if (isFieldKey(path)) {
        fields[path] = String(detail?.message ?? "Invalid value");
      }
    }

    return { fields };
  }

  return {
    topError: error?.response?.data?.error?.message ?? "Unable to create account",
    fields: {},
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopError(null);
    setFieldErrors({});

    try {
      await register(name, email, password);
      navigate("/onboarding");
    } catch (error) {
      const parsed = parseApiError(error);
      setTopError(parsed.topError ?? null);
      setFieldErrors(parsed.fields);
    }
  }

  const layoutStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    minHeight: "100vh",
    backgroundColor: "var(--bg-page)",
  };

  const brandPaneStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--accent-light)",
    padding: "48px 32px",
    position: "relative",
    overflow: "hidden",
  };

  const brandGridStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(var(--border-light) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-light) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    opacity: 0.5,
  };

  const brandCopyStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
  };

  const brandLogoStyle: CSSProperties = {
    fontSize: "32px",
    fontWeight: 700,
    color: "var(--accent)",
    margin: 0,
    marginBottom: "8px",
  };

  const brandTextStyle: CSSProperties = {
    fontSize: "16px",
    color: "var(--text-secondary)",
    margin: 0,
  };

  const formPaneStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 32px",
    backgroundColor: "var(--bg-surface)",
  };

  const formStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  };

  const errorBannerStyle: CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    color: "var(--status-failed)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(220, 38, 38, 0.3)",
    fontSize: "13px",
    fontWeight: 500,
  };

  const dividerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "8px 0",
  };

  const dividerLineStyle: CSSProperties = {
    flex: 1,
    height: "1px",
    backgroundColor: "var(--border-light)",
  };

  const dividerTextStyle: CSSProperties = {
    fontSize: "13px",
    color: "var(--text-muted)",
    fontWeight: 500,
    flex: "0 0 auto",
  };

  const ghostIconBtnStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all var(--transition-fast)",
  };

  return (
    <div style={layoutStyle}>
      <aside style={brandPaneStyle} aria-hidden="true">
        <div style={brandGridStyle} />
        <div style={brandCopyStyle}>
          <div style={brandLogoStyle}>DeployLens</div>
          <p style={brandTextStyle}>One view. Every deploy.</p>
        </div>
      </aside>
      <main style={formPaneStyle}>
        <AuthCard
          title="Create your account"
          subtitle="Start tracking deployments in minutes"
          footer={
            <p style={{ margin: 0 }}>
              Already have an account? <Link to="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
            </p>
          }
        >
          <form onSubmit={handleSubmit} style={formStyle}>
            {topError ? <div style={errorBannerStyle}>{topError}</div> : null}

            <AuthInput
              label="Full name"
              placeholder="John Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              disabled={isLoading}
              autoComplete="name"
            />
            <AuthInput
              label="Email"
              placeholder="john@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
              autoComplete="email"
              type="email"
            />
            <AuthInput
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
              rightElement={
                <button
                  type="button"
                  style={ghostIconBtnStyle}
                  onClick={() => setShowPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <AuthButton type="submit" isLoading={isLoading}>
              Create account
            </AuthButton>

            <div style={dividerStyle}>
              <div style={dividerLineStyle} />
              <span style={dividerTextStyle}>or</span>
              <div style={dividerLineStyle} />
            </div>

            <AuthButton
              type="button"
              variant="secondary"
              disabled
              icon={<Github size={16} />}
              title="Coming soon"
            >
              Sign in with GitHub
            </AuthButton>
          </form>
        </AuthCard>
      </main>
    </div>
  );
}
