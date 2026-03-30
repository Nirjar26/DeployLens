import { Check } from "lucide-react";
import { MouseEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import deployLensLogo from "../../assets/icons/custom/DeployLens.png";
import { useAuthStore } from "../../store/authStore";

type OnboardingStep = {
  key: "github" | "repos" | "aws" | "environments";
  title: string;
  description: string;
  to: string;
};

const STEPS: OnboardingStep[] = [
  {
    key: "github",
    title: "Connect GitHub",
    description: "Link your GitHub account",
    to: "/onboarding/github",
  },
  {
    key: "repos",
    title: "Select repos",
    description: "Choose repos to monitor",
    to: "/onboarding/repos",
  },
  {
    key: "aws",
    title: "Connect AWS",
    description: "Add CodeDeploy access",
    to: "/onboarding/aws",
  },
  {
    key: "environments",
    title: "Map environments",
    description: "Name your environments",
    to: "/onboarding/environments",
  },
];

function getActiveStep(pathname: string): OnboardingStep["key"] {
  if (pathname.includes("/onboarding/repos")) return "repos";
  if (pathname.includes("/onboarding/aws")) return "aws";
  if (pathname.includes("/onboarding/environments")) return "environments";
  return "github";
}

export default function OnboardingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const activeStep = getActiveStep(location.pathname);
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.key === activeStep));

  async function handleLogout(event?: MouseEvent<HTMLElement>) {
    event?.preventDefault();

    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors and clear local auth anyway
    }

    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="onboarding-shell">
      <aside className="onboarding-sidebar" aria-label="Onboarding setup steps">
        <div className="onboarding-sidebar-logo-row">
          <img src={deployLensLogo} alt="DeployLens" className="onboarding-sidebar-logo" />
          <span className="onboarding-sidebar-wordmark">DeployLens</span>
        </div>

        <div className="onboarding-sidebar-steps">
          <span className="onboarding-sidebar-steps-label">Setup steps</span>

          <div className="onboarding-step-list" role="list">
            {STEPS.map((step, index) => {
              const completed = index < activeIndex;
              const isActive = index === activeIndex;
              const stateClass = completed ? "completed" : isActive ? "active" : "upcoming";

              return (
                <div className="onboarding-step-item-wrap" key={step.key} role="listitem">
                  <button
                    type="button"
                    className={`onboarding-step-item onboarding-step-item-${stateClass}`}
                    onClick={() => {
                      if (!completed) return;
                      navigate(step.to);
                    }}
                    disabled={!completed}
                  >
                    <span className={`onboarding-step-indicator onboarding-step-indicator-${stateClass}`}>
                      {completed ? <Check size={12} aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="onboarding-step-copy">
                      <span className="onboarding-step-title">{step.title}</span>
                      <span className="onboarding-step-description">{isActive ? step.description : ""}</span>
                    </span>
                  </button>

                  {index < STEPS.length - 1 ? (
                    <div
                      className={`onboarding-step-connector ${index < activeIndex ? "onboarding-step-connector-completed" : ""}`}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="onboarding-sidebar-footer">
          <p className="onboarding-sidebar-help">Need help?</p>
          <a className="onboarding-sidebar-docs-link" href="https://docs.github.com" target="_blank" rel="noreferrer">
            View documentation →
          </a>
          <Link className="onboarding-sidebar-skip-link" to="/dashboard">
            Skip for now →
          </Link>
          <button type="button" className="onboarding-sidebar-logout-link" onClick={(event) => void handleLogout(event)}>
            Logout {user?.email ? `(${user.email})` : ""}
          </button>
        </div>
      </aside>

      <main className="onboarding-main-panel">
        <div className="onboarding-main-content" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
