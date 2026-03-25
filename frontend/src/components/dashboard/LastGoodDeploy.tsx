import { CSSProperties, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { deployments } from "../../lib/api";
import { useDeploymentStore } from "../../store/deploymentStore";

type LastGood = {
  id: string;
  commit_sha_short: string;
  commit_message: string;
  triggered_by: string;
  finished_at: string;
  environment_display_name: string;
  repository_name: string;
};

function formatRelative(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function LastGoodDeploy() {
  const [data, setData] = useState<LastGood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const result = await deployments.getLastGood();
        if (isMounted) {
          setData(result);
        }
      } catch {
        if (isMounted) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || !data) {
    return null;
  }

  const containerStyle: CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderLeft: "3px solid var(--status-success-text)",
    borderRadius: "var(--radius-md)",
    padding: "8px 14px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const centerStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    minWidth: 0,
  };

  const labelStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  const repoEnvStyle: CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const shaStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-sm)",
    padding: "1px 6px",
    color: "var(--text-secondary)",
  };

  const msgStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const timeStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
  };

  const linkStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--accent)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <CheckCircle2 size={14} color="var(--status-success-text)" />

      <div style={centerStyle}>
        <span style={labelStyle}>Last good deploy:</span>
        <span style={repoEnvStyle}>{data.repository_name} to {data.environment_display_name}</span>
        <span style={shaStyle}>{data.commit_sha_short}</span>
        <span style={msgStyle} title={data.commit_message}>{data.commit_message || "No commit message"}</span>
        <span style={timeStyle}>{formatRelative(data.finished_at)}</span>
      </div>

      <button type="button" style={linkStyle} onClick={() => void openDrawer(data.id)}>
        View
      </button>
    </div>
  );
}
