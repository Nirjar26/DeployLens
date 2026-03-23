import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { deployments } from "../../lib/api";

type CompareData = {
  deployment_a: any;
  deployment_b: any;
  diff: {
    duration_delta_seconds: number;
    duration_change_pct: number;
    status_changed: boolean;
    branch_changed: boolean;
    environment_changed: boolean;
    commits_between: number | null;
    commit_compare: {
      ahead_by: number;
      behind_by: number;
      commits: Array<{ sha: string; message: string; author: string }>;
    } | null;
  };
};

type Props = {
  open: boolean;
  deploymentAId: string | null;
  deploymentBId: string | null;
  onClose: () => void;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function CompareModal({ open, deploymentAId, deploymentBId, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompareData | null>(null);

  useEffect(() => {
    if (!open || !deploymentAId || !deploymentBId) {
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    void deployments.compare(deploymentAId, deploymentBId)
      .then((result) => {
        if (!mounted) return;
        setData(result as CompareData);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Failed to compare deployments.");
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, deploymentAId, deploymentBId]);

  if (!open) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal-container dl-compare-modal" onClick={(event) => event.stopPropagation()}>
        <div className="dl-modal-header">
          <div className="dl-modal-header-center">
            <h3 className="dl-modal-title">Compare Deployments</h3>
          </div>
          <button type="button" className="dl-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="dl-modal-body">
          {isLoading ? <p className="analytics-empty">Loading comparison...</p> : null}
          {error ? <p className="analytics-empty">{error}</p> : null}

          {!isLoading && !error && data ? (
            <>
              <div className="dl-compare-grid">
                <div className="dl-compare-card">
                  <h4>Deployment A</h4>
                  <p>{data.deployment_a.repository.full_name}</p>
                  <p>{data.deployment_a.branch}</p>
                  <p>{data.deployment_a.commit_sha_short}</p>
                  <p>{data.deployment_a.unified_status}</p>
                  <p>{formatDuration(data.deployment_a.duration_seconds)}</p>
                </div>

                <div className="dl-compare-card">
                  <h4>Deployment B</h4>
                  <p>{data.deployment_b.repository.full_name}</p>
                  <p>{data.deployment_b.branch}</p>
                  <p>{data.deployment_b.commit_sha_short}</p>
                  <p>{data.deployment_b.unified_status}</p>
                  <p>{formatDuration(data.deployment_b.duration_seconds)}</p>
                </div>
              </div>

              <div className="dl-compare-diff">
                <p>Duration delta: {formatDuration(Math.abs(data.diff.duration_delta_seconds))} {data.diff.duration_delta_seconds >= 0 ? "slower" : "faster"}</p>
                <p>Duration change: {data.diff.duration_change_pct}%</p>
                <p>Status changed: {data.diff.status_changed ? "Yes" : "No"}</p>
                <p>Branch changed: {data.diff.branch_changed ? "Yes" : "No"}</p>
                <p>Environment changed: {data.diff.environment_changed ? "Yes" : "No"}</p>
                <p>Commits between: {data.diff.commits_between ?? "Unknown"}</p>
              </div>

              {data.diff.commit_compare?.commits?.length ? (
                <div className="dl-compare-commit-list">
                  <h4>Commits in between</h4>
                  {data.diff.commit_compare.commits.slice(0, 10).map((commit) => (
                    <div key={`${commit.sha}-${commit.message}`} className="dl-compare-commit-item">
                      <span className="dl-sha-pill">{commit.sha}</span>
                      <span>{commit.message || "No message"}</span>
                      <span className="dl-cell-time">by {commit.author}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="dl-modal-footer">
          <button type="button" className="dl-modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
