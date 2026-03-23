import { MouseEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import StepIndicator from "../../components/onboarding/StepIndicator";
import { useAuthStore } from "../../store/authStore";

function getActiveStep(pathname: string) {
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

  async function handleLogout(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

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
      <header className="onboarding-header">
        <div className="onboarding-logo">DeployLens</div>
        <div className="onboarding-user-meta">
          <span>{user?.email}</span>
          <Link to="#" onClick={handleLogout}>
            Logout
          </Link>
        </div>
      </header>

      <main className="onboarding-main">
        <div className="onboarding-content">
          <StepIndicator active={activeStep} />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
