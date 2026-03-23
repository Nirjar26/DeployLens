import { Eye, EyeOff, Github } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthButton from "../components/auth/AuthButton";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import { github } from "../lib/api";
import { useAuthStore } from "../store/authStore";

type FieldErrors = {
  email?: string;
  password?: string;
};

type FieldKey = keyof FieldErrors;

function isFieldKey(path: unknown): path is FieldKey {
  return path === "email" || path === "password";
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
    topError: error?.response?.data?.error?.message ?? "Unable to sign in",
    fields: {},
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
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
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      const parsed = parseApiError(error);
      setTopError(parsed.topError ?? null);
      setFieldErrors(parsed.fields);
    }
  }

  async function handleGithubSignIn() {
    setTopError(null);

    try {
      window.location.href = github.connectUrl();
    } catch (error) {
      setTopError(error instanceof Error ? error.message : "Unable to start GitHub sign-in");
    }
  }

  return (
    <div className="auth-layout">
      <aside className="brand-pane" aria-hidden="true">
        <div className="brand-grid" />
        <div className="brand-copy">
          <div className="brand-logo">DeployLens</div>
          <p>One view. Every deploy.</p>
        </div>
      </aside>
      <main className="form-pane">
        <AuthCard
          title="Welcome back"
          subtitle="Sign in to your account"
          footer={
            <p>
              Don&apos;t have an account? <Link to="/register">Create one</Link>
            </p>
          }
        >
          <form onSubmit={handleSubmit} className="auth-form">
            {topError ? <div className="form-error-banner">{topError}</div> : null}

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
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              rightElement={
                <button
                  type="button"
                  className="ghost-icon-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="forgot-row">
              <a href="#" onClick={(event) => event.preventDefault()}>
                Forgot password?
              </a>
            </div>

            <AuthButton type="submit" isLoading={isLoading}>
              Sign in
            </AuthButton>

            <AuthButton
              type="button"
              variant="secondary"
              icon={<Github size={16} />}
              onClick={handleGithubSignIn}
              disabled={isLoading}
            >
              Sign in with GitHub
            </AuthButton>
          </form>
        </AuthCard>
      </main>
    </div>
  );
}
