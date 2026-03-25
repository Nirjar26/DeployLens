import { PropsWithChildren, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingLayout from "./pages/onboarding/OnboardingLayout";
import ConnectGithubPage from "./pages/onboarding/ConnectGithubPage";
import SelectReposPage from "./pages/onboarding/SelectReposPage";
import ConnectAwsPage from "./pages/onboarding/ConnectAwsPage";
import MapEnvironmentsPage from "./pages/onboarding/MapEnvironmentsPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProtectedLayout from "./components/layout/ProtectedLayout";
import IntegrationsPage from "./pages/settings/IntegrationsPage";
import RepositoriesPage from "./pages/settings/RepositoriesPage";
import EnvironmentsPage from "./pages/settings/EnvironmentsPage";
import ProfilePage from "./pages/settings/ProfilePage";
import SecurityPage from "./pages/settings/SecurityPage";
import AuditLogPage from "./pages/settings/AuditLogPage";
import { setAuthFailureHandler } from "./lib/api";
import { useSocket } from "./hooks/useSocket";
import { useAuthStore } from "./store/authStore";

function FullScreenSpinner() {
  console.log("FullScreenSpinner: rendering");
  return (
    <div className="screen-loader"  style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg-page)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" aria-hidden="true" />
        <p style={{ marginTop: "16px", color: "var(--text-muted)" }}>Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isInitialized) {
    return <FullScreenSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return <FullScreenSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AuthAwareRedirect() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return <FullScreenSpinner />;
  }

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const didInitRef = useRef(false);

  console.log("App.tsx: component mounting");

  try {
    useSocket();
  } catch (error) {
    console.error("App.tsx: useSocket failed", error);
  }

  useEffect(() => {
    if (didInitRef.current) {
      return;
    }

    didInitRef.current = true;

    setAuthFailureHandler(() => {
      clearAuth();

      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    });

    void initAuth();
  }, [clearAuth, initAuth, location.pathname, navigate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/onboarding/github" replace />} />
        <Route path="github" element={<ConnectGithubPage />} />
        <Route path="repos" element={<SelectReposPage />} />
        <Route path="aws" element={<ConnectAwsPage />} />
        <Route path="environments" element={<MapEnvironmentsPage />} />
      </Route>

      {/* Protected pages with sidebar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <DashboardPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <AnalyticsPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings pages */}
      <Route
        path="/settings/integrations"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <IntegrationsPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/repositories"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <RepositoriesPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/environments"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <EnvironmentsPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <ProfilePage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <SecurityPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/audit"
        element={
          <ProtectedRoute>
            <ProtectedLayout onLogout={clearAuth}>
              <AuditLogPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<AuthAwareRedirect />} />
    </Routes>
  );
}
