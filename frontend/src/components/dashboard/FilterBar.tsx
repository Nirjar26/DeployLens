import { CSSProperties } from "react";
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
  onToggleMine?: (triggeredBy: string | null) => void;
};

export default function FilterBar({ filters, onChangeFilter, onClear, compareMode, onToggleCompareMode, onToggleMine }: Props) {
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

  const filterCardStyle: CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "10px 14px",
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  };

  const filterRowStyle: CSSProperties = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  };

  const selectWrapStyle: CSSProperties = {
    position: "relative",
    minWidth: "120px",
    flex: "1.5",
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    height: "32px",
    padding: "0 12px 0 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-sunken)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    appearance: "none",
    transition: "all var(--transition-fast)",
  };

  const selectArrowStyle: CSSProperties = {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  };

  const clearBtnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 10px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-sunken)",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    height: "32px",
    flexShrink: 0,
  };

  const compareToggleStyle: CSSProperties = {
    ...clearBtnStyle,
    ...(compareMode && {
      backgroundColor: "var(--accent-light)",
      color: "var(--accent)",
      borderColor: "var(--accent-border)",
    }),
  };

  const mineToggleStyle: CSSProperties = {
    ...clearBtnStyle,
    ...(!!filters.triggered_by && {
      backgroundColor: "var(--accent-light)",
      color: "var(--accent)",
      borderColor: "var(--accent-border)",
    }),
  };

  const branchWrapStyle: CSSProperties = {
    position: "relative",
    flex: 1,
    minWidth: "200px",
  };

  const branchIconStyle: CSSProperties = {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    pointerEvents: "none",
  };

  const filterInputStyle: CSSProperties = {
    width: "100%",
    height: "32px",
    padding: "8px 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-sunken)",
    color: "var(--text-primary)",
    fontSize: "13px",
    transition: "all var(--transition-fast)",
  };

  const branchInputStyle: CSSProperties = {
    ...filterInputStyle,
    paddingLeft: "36px",
    flex: 1,
    minWidth: "150px",
  };

  const dateFieldStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const dateLabelStyle: CSSProperties = {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  };

  const dateInputStyle: CSSProperties = {
    ...filterInputStyle,
    width: "130px",
    flex: 0,
  };

  return (
    <div style={filterCardStyle}>
      {/* Repo Dropdown */}
      <div style={selectWrapStyle}>
        <select
          value={filters.repo}
          onChange={(e) => void onChangeFilter("repo", e.target.value)}
          style={selectStyle}
        >
          <option value="">All repos</option>
          {trackedRepos.map((repo) => (
            <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
          ))}
        </select>
        <svg style={selectArrowStyle} width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Environment Dropdown */}
      <div style={selectWrapStyle}>
        <select
          value={filters.environment}
          onChange={(e) => void onChangeFilter("environment", e.target.value)}
          style={selectStyle}
        >
          <option value="">All environments</option>
          {environments.map((env) => (
            <option key={env.id} value={env.display_name}>{env.display_name}</option>
          ))}
        </select>
        <svg style={selectArrowStyle} width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Status Dropdown */}
      <div style={{ ...selectWrapStyle, flex: 1 }}>
        <select
          value={filters.status}
          onChange={(e) => void onChangeFilter("status", e.target.value)}
          style={selectStyle}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="rolled_back">Rolled back</option>
        </select>
        <svg style={selectArrowStyle} width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Mine Toggle */}
      {onToggleMine && (
        <button
          type="button"
          style={{ ...clearBtnStyle, minWidth: "70px", justifyContent: "center" }}
          onClick={() => {
            if (filters.triggered_by) {
              onToggleMine(null);
            } else {
              onToggleMine("");
            }
          }}
        >
          Mine
        </button>
      )}

      {/* Branch Input */}
      <div style={{ position: "relative", flex: 1, minWidth: "150px" }}>
        <Search size={14} style={branchIconStyle} />
        <input
          style={branchInputStyle}
          placeholder="Filter by branch..."
          value={branchInput}
          onChange={(e) => setBranchInput(e.target.value)}
          data-branch-input
        />
      </div>

      {/* From Date */}
      <div style={dateFieldStyle}>
        <label style={dateLabelStyle}>From</label>
        <input
          style={dateInputStyle}
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ""}
          onChange={(e) =>
            void onChangeFilter("from", e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : "")
          }
        />
      </div>

      {/* To Date */}
      <div style={dateFieldStyle}>
        <label style={dateLabelStyle}>To</label>
        <input
          style={dateInputStyle}
          type="date"
          value={filters.to ? filters.to.slice(0, 10) : ""}
          onChange={(e) =>
            void onChangeFilter("to", e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString() : "")
          }
        />
      </div>

      {/* Clear Filters (only when active) */}
      {hasActive && (
        <button type="button" style={clearBtnStyle} onClick={onClear}>
          <X size={12} />
          Clear
        </button>
      )}

      {/* Compare Toggle */}
      <button
        type="button"
        style={{ ...clearBtnStyle, minWidth: "120px", justifyContent: "center" }}
        onClick={onToggleCompareMode}
      >
        {compareMode ? "Exit compare" : "Compare"}
      </button>
    </div>
  );
}
