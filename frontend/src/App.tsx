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
import SettingsPage from "./pages/SettingsPage";
import { setAuthFailureHandler } from "./lib/api";
import { useSocket } from "./hooks/useSocket";
import { useAuthStore } from "./store/authStore";

function FullScreenSpinner() {
  return (
    <div className="screen-loader">
      <div className="spinner" aria-hidden="true" />
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
  useSocket();

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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<AuthAwareRedirect />} />
    </Routes>
  );
}
