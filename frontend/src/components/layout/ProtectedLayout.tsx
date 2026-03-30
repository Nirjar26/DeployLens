import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Sidebar from "../dashboard/Sidebar";

interface ProtectedLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export default function ProtectedLayout({ children, onLogout }: ProtectedLayoutProps) {
  const location = useLocation();
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= 900;
  });

  useEffect(() => {
    function handleResize() {
      setIsCompact(window.innerWidth <= 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div style={{
      display: "flex",
      flexDirection: isCompact ? "column" : "row",
      height: "100dvh",
      overflow: "hidden",
      backgroundColor: "var(--bg-page)",
    }}>
      {!isCompact && <Sidebar onLogout={onLogout} />}

      {isCompact && (
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-light)",
          padding: "10px 12px",
          display: "grid",
          gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>DeployLens</span>
            <button
              onClick={onLogout}
              style={{
                border: "1px solid var(--status-failed-border)",
                background: "var(--status-failed-bg)",
                color: "var(--status-failed-text)",
                borderRadius: "var(--radius-md)",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
            <Link to="/dashboard" style={{
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: 600,
              color: isActive("/dashboard") ? "var(--text-accent)" : "var(--text-secondary)",
              background: isActive("/dashboard") ? "var(--bg-active)" : "var(--bg-sunken)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-full)",
              padding: "6px 10px",
            }}>Dashboard</Link>
            <Link to="/analytics" style={{
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: 600,
              color: isActive("/analytics") ? "var(--text-accent)" : "var(--text-secondary)",
              background: isActive("/analytics") ? "var(--bg-active)" : "var(--bg-sunken)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-full)",
              padding: "6px 10px",
            }}>Analytics</Link>
            <Link to="/settings/integrations" style={{
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: 600,
              color: isActive("/settings") ? "var(--text-accent)" : "var(--text-secondary)",
              background: isActive("/settings") ? "var(--bg-active)" : "var(--bg-sunken)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-full)",
              padding: "6px 10px",
            }}>Settings</Link>
            <Link to="/onboarding/github" style={{
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: 600,
              color: isActive("/onboarding") ? "var(--text-accent)" : "var(--text-secondary)",
              background: isActive("/onboarding") ? "var(--bg-active)" : "var(--bg-sunken)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-full)",
              padding: "6px 10px",
            }}>Setup</Link>
          </div>
        </div>
      )}

      <main style={{
        marginLeft: isCompact ? 0 : "var(--sidebar-width)",
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
