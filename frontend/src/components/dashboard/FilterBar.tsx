import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";
import { DeploymentFilters } from "../../store/deploymentStore";

type Props = {
  filters: DeploymentFilters;
  onChangeFilter: (key: keyof Omit<DeploymentFilters, "page" | "limit"> | "limit", value: string | number) => void;
  onClear: () => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
};

export default function FilterBar({ filters, onChangeFilter, onClear, compareMode, onToggleCompareMode }: Props) {
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const environments = useAwsStore((state) => state.environments);
  const [branchInput, setBranchInput] = useState(filters.branch);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void onChangeFilter("branch", branchInput);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [branchInput, onChangeFilter]);

  useEffect(() => {
    setBranchInput(filters.branch);
  }, [filters.branch]);

  const hasActive = useMemo(() => {
    return Boolean(filters.repo || filters.environment || filters.status || filters.branch || filters.from || filters.to);
  }, [filters]);

  return (
    <div className="dl-filter-card">
      {/* Row 1: Dropdowns + Clear */}
      <div className="dl-filter-row">
        <div className="dl-select-wrap">
          <select
            value={filters.repo}
            onChange={(e) => void onChangeFilter("repo", e.target.value)}
            className="dl-filter-select"
          >
            <option value="">All repos</option>
            {trackedRepos.map((repo) => (
              <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
            ))}
          </select>
          <svg className="dl-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="dl-select-wrap">
          <select
            value={filters.environment}
            onChange={(e) => void onChangeFilter("environment", e.target.value)}
            className="dl-filter-select"
          >
            <option value="">All environments</option>
            {environments.map((env) => (
              <option key={env.id} value={env.display_name}>{env.display_name}</option>
            ))}
          </select>
          <svg className="dl-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="dl-select-wrap">
          <select
            value={filters.status}
            onChange={(e) => void onChangeFilter("status", e.target.value)}
            className="dl-filter-select"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="rolled_back">Rolled back</option>
          </select>
          <svg className="dl-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {hasActive && (
          <button type="button" className="dl-clear-btn" onClick={onClear}>
            <X size={12} />
            Clear filters
          </button>
        )}

        <button
          type="button"
          className={`dl-clear-btn dl-compare-toggle ${compareMode ? "dl-compare-toggle-active" : ""}`}
          onClick={onToggleCompareMode}
        >
          {compareMode ? "Exit compare" : "Compare deployments"}
        </button>
      </div>

      {/* Row 2: Branch input + date range */}
      <div className="dl-filter-row dl-filter-row-2">
        <div className="dl-branch-wrap">
          <Search size={14} className="dl-branch-icon" />
          <input
            className="dl-filter-input dl-branch-input"
            placeholder="Filter by branch..."
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
          />
        </div>

        <div className="dl-date-field">
          <label className="dl-date-label">From</label>
          <input
            className="dl-filter-input dl-date-input"
            type="date"
            value={filters.from ? filters.from.slice(0, 10) : ""}
            onChange={(e) =>
              void onChangeFilter("from", e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : "")
            }
          />
        </div>

        <div className="dl-date-field">
          <label className="dl-date-label">To</label>
          <input
            className="dl-filter-input dl-date-input"
            type="date"
            value={filters.to ? filters.to.slice(0, 10) : ""}
            onChange={(e) =>
              void onChangeFilter("to", e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString() : "")
            }
          />
        </div>
      </div>
    </div>
  );
}
