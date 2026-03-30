import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";
import auditIcon from "../../assets/icons/custom/audit-svgrepo-com.svg";
import connectIcon from "../../assets/icons/custom/connect-svgrepo-com.svg";
import deployLensLogo from "../../assets/icons/custom/DeployLens.png";
import logoutIcon from "../../assets/icons/custom/sign-out-left-2-svgrepo-com.svg";

function SvgMaskIcon({ src, size = 16 }: { src: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        backgroundColor: "currentColor",
        maskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

function LogoDeploy() {
  return (
    <img
      src={deployLensLogo}
      alt="DeployLens"
      style={{
        width: "30px",
        height: "30px",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="3" height="3" rx="0.5" />
      <rect x="6" y="3" width="3" height="3" rx="0.5" />
      <rect x="11" y="3" width="3" height="3" rx="0.5" />
      <rect x="1" y="8" width="3" height="3" rx="0.5" />
      <rect x="6" y="8" width="3" height="3" rx="0.5" />
      <rect x="11" y="8" width="3" height="3" rx="0.5" />
      <rect x="1" y="13" width="3" height="3" rx="0.5" />
      <rect x="6" y="13" width="3" height="3" rx="0.5" />
      <rect x="11" y="13" width="3" height="3" rx="0.5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.586 2l1.414 1.414-2 2A3 3 0 0 0 8 12h1v2H8a5 5 0 0 1-1.414-9.414l2 2L8.414 2H6.586zM9.414 14l-1.414-1.414 2-2A3 3 0 0 0 8 4H7V2h1a5 5 0 0 1 1.414 9.414l-2-2L9.414 14z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2h6l2 2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1L1.5 4v2l6.5 3 6.5-3V4L8 1zm0 10L1.5 8v2l6.5 3 6.5-3v-2L8 11z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l6 2v4c0 4.4-3.2 6.3-6 7-2.8-.7-6-2.6-6-7V3l6-2z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
    </svg>
  );
}

function RoadmapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 3h2.8a1.2 1.2 0 1 1 0 2.4H3.2a1.2 1.2 0 1 0 0 2.4h4.4a1.2 1.2 0 1 1 0 2.4H6.1a1.2 1.2 0 1 0 0 2.4H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="2.4" cy="3" r="1" fill="currentColor" />
      <circle cx="13.6" cy="12.6" r="1" fill="currentColor" />
    </svg>
  );
}

function GithubDot() {
  return <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--status-success-text)" }} />;
}

function AwsDot() {
  return <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--status-failed-text)" }} />;
}

type SidebarProps = {
  onLogout: () => void;
};

export default function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const awsConnected = useAwsStore((state) => state.awsConnected);
  const environments = useAwsStore((state) => state.environments);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  // Determine active states
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const onboardingStepsComplete = [
    githubConnected,
    trackedRepos.length > 0,
    awsConnected,
    environments.length > 0,
  ].filter(Boolean).length;
  const onboardingProgress = Math.round((onboardingStepsComplete / 4) * 100);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileOpen]);

  return (
    <aside style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "var(--sidebar-width)",
      height: "100vh",
      backgroundColor: "var(--bg-surface)",
      borderRight: "1px solid var(--border-light)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      overflow: "hidden",
    }}>
      {/* Logo Area */}
      <div style={{
        height: "78px",
        padding: "0 20px",
        borderBottom: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <LogoDeploy />
        <span style={{
          fontSize: "20px",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.6px",
        }}>
          DeployLens
        </span>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}>
        {onboardingStepsComplete < 4 && (
          <div style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-lg)",
            padding: "12px",
            textAlign: "center",
            display: "grid",
            gap: "8px",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
            }}>
              Onboarding Roadmap
            </div>
            <div style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}>
              {onboardingStepsComplete} of 4 complete
            </div>
            <div style={{
              width: "100%",
              height: "6px",
              borderRadius: "var(--radius-full)",
              background: "var(--border-light)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${onboardingProgress}%`,
                height: "100%",
                background: "var(--accent)",
                transition: "width var(--transition-base)",
              }} />
            </div>
            <Link
              to="/onboarding/github"
              style={{
                justifySelf: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              Open setup roadmap →
            </Link>
          </div>
        )}

        <div>
          <label style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            padding: "0 8px",
            display: "block",
            marginBottom: "4px",
          }}>
            ONBOARDING
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <Link
              to="/onboarding/github"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/onboarding") ? "var(--bg-active)" : "transparent",
                color: isActive("/onboarding") ? "var(--text-accent)" : "var(--text-secondary)",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <RoadmapIcon />
                <span style={{ fontSize: "13px", fontWeight: isActive("/onboarding") ? 600 : 500 }}>Setup Roadmap</span>
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}>
                {onboardingStepsComplete}/4
              </span>
            </Link>
          </div>
        </div>

        {/* MAIN Section */}
        <div>
          <label style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            padding: "0 8px",
            display: "block",
            marginBottom: "4px",
          }}>
            MAIN
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <Link
              to="/dashboard"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/dashboard") ? "var(--bg-active)" : "transparent",
                color: isActive("/dashboard") ? "var(--text-accent)" : "var(--text-secondary)",
              }}
            >
              <MenuIcon />
              <span style={{ fontSize: "13px", fontWeight: isActive("/dashboard") ? 600 : 500 }}>Dashboard</span>
            </Link>
            <Link
              to="/analytics"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/analytics") ? "var(--bg-active)" : "transparent",
                color: isActive("/analytics") ? "var(--text-accent)" : "var(--text-secondary)",
              }}
            >
              <ListIcon />
              <span style={{ fontSize: "13px", fontWeight: isActive("/analytics") ? 600 : 500 }}>Analytics</span>
            </Link>
          </div>
        </div>

        {/* CONFIGURATION Section */}
        <div>
          <label style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            padding: "0 8px",
            display: "block",
            marginBottom: "4px",
          }}>
            CONFIGURATION
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {/* Integrations with status dots */}
            <Link
              to="/settings/integrations"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/integrations") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/integrations") ? "var(--text-accent)" : "var(--text-secondary)",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <SvgMaskIcon src={connectIcon} />
                <span style={{ fontSize: "13px", fontWeight: isActive("/settings/integrations") ? 600 : 500 }}>Integrations</span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <GithubDot />
                <AwsDot />
              </div>
            </Link>

            {/* Repositories with count pill */}
            <Link
              to="/settings/repositories"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/repositories") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/repositories") ? "var(--text-accent)" : "var(--text-secondary)",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderIcon />
                <span style={{ fontSize: "13px", fontWeight: isActive("/settings/repositories") ? 600 : 500 }}>Repositories</span>
              </div>
              <div style={{
                background: "var(--bg-sunken)",
                color: "var(--text-muted)",
                fontSize: "11px",
                fontWeight: 600,
                padding: "0 6px",
                borderRadius: "var(--radius-full)",
                minWidth: "20px",
                textAlign: "center",
              }}>
                3
              </div>
            </Link>

            {/* Environments with count pill */}
            <Link
              to="/settings/environments"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/environments") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/environments") ? "var(--text-accent)" : "var(--text-secondary)",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <LayersIcon />
                <span style={{ fontSize: "13px", fontWeight: isActive("/settings/environments") ? 600 : 500 }}>Environments</span>
              </div>
              <div style={{
                background: "var(--bg-sunken)",
                color: "var(--text-muted)",
                fontSize: "11px",
                fontWeight: 600,
                padding: "0 6px",
                borderRadius: "var(--radius-full)",
                minWidth: "20px",
                textAlign: "center",
              }}>
                2
              </div>
            </Link>
          </div>
        </div>

        {/* ACCOUNT Section */}
        <div>
          <label style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            padding: "0 8px",
            display: "block",
            marginBottom: "4px",
          }}>
            ACCOUNT
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <Link
              to="/settings/profile"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/profile") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/profile") ? "var(--text-accent)" : "var(--text-secondary)",
              }}
            >
              <UserIcon />
              <span style={{ fontSize: "13px", fontWeight: isActive("/settings/profile") ? 600 : 500 }}>Profile</span>
            </Link>
            <Link
              to="/settings/security"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/security") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/security") ? "var(--text-accent)" : "var(--text-secondary)",
              }}
            >
              <ShieldIcon />
              <span style={{ fontSize: "13px", fontWeight: isActive("/settings/security") ? 600 : 500 }}>Security</span>
            </Link>
            <Link
              to="/settings/audit"
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all var(--transition-base)",
                textDecoration: "none",
                background: isActive("/settings/audit") ? "var(--bg-active)" : "transparent",
                color: isActive("/settings/audit") ? "var(--text-accent)" : "var(--text-secondary)",
              }}
            >
              <SvgMaskIcon src={auditIcon} />
              <span style={{ fontSize: "13px", fontWeight: isActive("/settings/audit") ? 600 : 500 }}>Audit Log</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* User Area Bottom */}
      <div style={{
        borderTop: "1px solid var(--border-light)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        position: "relative",
      }}>
        <div style={{
          width: "30px",
          height: "30px",
          borderRadius: "var(--radius-full)",
          background: "var(--accent-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--accent)",
          flexShrink: 0,
        }}>
          {userInitial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {user?.name || "User"}
          </div>
          <div style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {user?.email || ""}
          </div>
        </div>
        <button
          ref={buttonRef}
          onClick={() => setProfileOpen(!profileOpen)}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--status-failed-text)",
            transition: "all var(--transition-base)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--status-failed-bg)";
            (e.currentTarget as HTMLElement).style.color = "var(--status-failed-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--status-failed-text)";
          }}
        >
          <SvgMaskIcon src={logoutIcon} size={14} />
        </button>

        {profileOpen && (
          <div ref={profileRef} style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "8px 0",
            minWidth: "140px",
          }}>
            <button
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--status-failed-text)",
                fontSize: "13px",
                textAlign: "left",
                transition: "background var(--transition-base)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
