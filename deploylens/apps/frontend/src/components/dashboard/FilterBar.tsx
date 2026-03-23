import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";
import { DeploymentFilters } from "../../store/deploymentStore";

type Props = {
  filters: DeploymentFilters;
  onChangeFilter: (key: keyof Omit<DeploymentFilters, "page" | "limit"> | "limit", value: string | number) => void;
  onClear: () => void;
};

export default function FilterBar({ filters, onChangeFilter, onClear }: Props) {
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
    return Boolean(filters.repo || filters.environment || filters.status || filters.branch || filters.from || filters.to || filters.limit !== 20);
  }, [filters]);

  return (
    <div className="filter-bar">
      <div className="filter-left">
        <select value={filters.repo} onChange={(e) => void onChangeFilter("repo", e.target.value)} className="auth-input">
          <option value="">All repos</option>
          {trackedRepos.map((repo) => (
            <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
          ))}
        </select>

        <select value={filters.environment} onChange={(e) => void onChangeFilter("environment", e.target.value)} className="auth-input">
          <option value="">All environments</option>
          {environments.map((env) => (
            <option key={env.id} value={env.display_name}>{env.display_name}</option>
          ))}
        </select>

        <select value={filters.status} onChange={(e) => void onChangeFilter("status", e.target.value)} className="auth-input">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="rolled_back">Rolled back</option>
        </select>

        <input className="auth-input" placeholder="Filter by branch..." value={branchInput} onChange={(e) => setBranchInput(e.target.value)} />
      </div>

      <div className="filter-right">
        <input className="auth-input" type="date" value={filters.from} onChange={(e) => void onChangeFilter("from", e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : "")} />
        <input className="auth-input" type="date" value={filters.to} onChange={(e) => void onChangeFilter("to", e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString() : "")} />
        {hasActive ? <button type="button" className="link-button" onClick={onClear}>Clear filters</button> : null}
      </div>
    </div>
  );
}
