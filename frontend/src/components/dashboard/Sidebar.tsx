import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useDeploymentStore } from "../../store/deploymentStore";

function DeployLensLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#14b8a6" />
      <path d="M16 8L16 20M16 8L11 13M16 8L21 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 22H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={active ? "#14b8a6" : "currentColor"} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={active ? "#14b8a6" : "currentColor"} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={active ? "#14b8a6" : "currentColor"} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={active ? "#14b8a6" : "currentColor"} />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5H12M2 7H12M2 10.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EnvironmentsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5.25" y="1" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="1" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13.05 10.13a1.2 1.2 0 00.24 1.32l.04.05a1.46 1.46 0 11-2.06 2.06l-.05-.04a1.2 1.2 0 00-1.32-.24 1.2 1.2 0 00-.73 1.1v.13a1.46 1.46 0 01-2.91 0v-.07a1.2 1.2 0 00-.79-1.1 1.2 1.2 0 00-1.32.24l-.05.04a1.46 1.46 0 11-2.06-2.06l.04-.05a1.2 1.2 0 00.24-1.32 1.2 1.2 0 00-1.1-.73H1.5a1.46 1.46 0 010-2.91h.07a1.2 1.2 0 001.1-.79 1.2 1.2 0 00-.24-1.32l-.04-.05a1.46 1.46 0 112.06-2.06l.05.04a1.2 1.2 0 001.32.24h.06a1.2 1.2 0 00.73-1.1V1.5a1.46 1.46 0 012.91 0v.07a1.2 1.2 0 00.73 1.1 1.2 1.2 0 001.32-.24l.05-.04a1.46 1.46 0 112.06 2.06l-.04.05a1.2 1.2 0 00-.24 1.32v.06a1.2 1.2 0 001.1.73h.13a1.46 1.46 0 010 2.91h-.07a1.2 1.2 0 00-1.1.73z" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 14H3.33A1.33 1.33 0 012 12.67V3.33A1.33 1.33 0 013.33 2H6M10.67 11.33L14 8l-3.33-3.33M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SidebarProps = {
  onLogout: () => void;
};

export default function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const activeView = useDeploymentStore((state) => state.activeView);
  const setView = useDeploymentStore((state) => state.setView);

  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);

  const isDashboard = location.pathname === "/dashboard";
  const isSettings = location.pathname === "/settings";
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setPopupOpen(false);
      }
    }

    if (popupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupOpen]);

  return (
    <aside className="dl-sidebar">
      {/* Top: Logo */}
      <div className="dl-sidebar-top">
        <div className="dl-sidebar-logo-row">
          <DeployLensLogo />
          <span className="dl-sidebar-wordmark">DeployLens</span>
        </div>
        <div className="dl-sidebar-divider" />

        {/* User profile */}
        <div className="dl-sidebar-profile-wrap">
          <button
            ref={profileRef}
            type="button"
            className="dl-sidebar-profile-btn"
            onClick={() => setPopupOpen((prev) => !prev)}
          >
            <span className="dl-sidebar-avatar">{userInitial}</span>
            <span className="dl-sidebar-profile-info">
              <span className="dl-sidebar-profile-name truncate">{user?.name ?? "User"}</span>
              <span className="dl-sidebar-profile-email truncate">{user?.email ?? ""}</span>
            </span>
            <ChevronDown className={`dl-sidebar-chevron ${popupOpen ? "dl-sidebar-chevron-open" : ""}`} />
          </button>

          {popupOpen && (
            <div ref={popupRef} className="dl-sidebar-popup">
              <span className="dl-sidebar-popup-label">Signed in as</span>
              <span className="dl-sidebar-popup-email">{user?.email ?? ""}</span>
              <div className="dl-sidebar-popup-divider" />
              <button type="button" className="dl-sidebar-popup-item" onClick={() => setPopupOpen(false)}>
                View profile
              </button>
              <div className="dl-sidebar-popup-divider" />
              <button
                type="button"
                className="dl-sidebar-popup-item dl-sidebar-popup-logout"
                onClick={() => {
                  setPopupOpen(false);
                  onLogout();
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
        <div className="dl-sidebar-divider" />
      </div>

      {/* Middle: Nav */}
      <nav className="dl-sidebar-nav">
        <span className="dl-sidebar-section-label">MAIN</span>

        <Link
          to="/dashboard"
          className={`dl-sidebar-nav-item ${isDashboard ? "dl-sidebar-nav-item-active" : ""}`}
        >
          <DashboardIcon active={isDashboard} />
          <span>Dashboard</span>
        </Link>

        {isDashboard && (
          <div className="dl-sidebar-subnav">
            <button
              type="button"
              className={`dl-sidebar-subnav-item ${activeView === "pipeline" ? "dl-sidebar-subnav-active" : ""}`}
              onClick={() => setView("pipeline")}
            >
              <PipelineIcon />
              <span>Pipeline</span>
            </button>
            <button
              type="button"
              className={`dl-sidebar-subnav-item ${activeView === "environments" ? "dl-sidebar-subnav-active" : ""}`}
              onClick={() => setView("environments")}
            >
              <EnvironmentsIcon />
              <span>Environments</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="dl-sidebar-bottom">
        <div className="dl-sidebar-divider" />
        <Link
          to="/settings"
          className={`dl-sidebar-nav-item ${isSettings ? "dl-sidebar-nav-item-active" : ""}`}
        >
          <SettingsIcon />
          <span>Settings</span>
        </Link>
        <button type="button" className="dl-sidebar-nav-item dl-sidebar-logout-item" onClick={onLogout}>
          <LogoutIcon />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
