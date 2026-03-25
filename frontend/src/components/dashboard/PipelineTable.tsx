import { CSSProperties } from "react";
import { useState } from "react";
import { CheckCircle2, Clock3, Timer, Users } from "lucide-react";
import { DeploymentRow as DeploymentRowType, PaginationInfo } from "../../store/deploymentStore";
import DeploymentRow from "./DeploymentRow";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import { DeploymentFilters } from "../../store/deploymentStore";

type Props = {
  rows: DeploymentRowType[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  hasFilters: boolean;
  filters: DeploymentFilters;
  onOpen: (id: string) => void;
  onClearFilters: () => void;
  onSetPage: (page: number) => void;
  onSetLimit: (limit: number) => void;
  compareMode: boolean;
  compareSelection: string[];
  onToggleCompareSelection: (id: string) => void;
  onOpenCompare: () => void;
  sortBy?: "created_at" | "duration_seconds" | "unified_status";
  sortDir?: "asc" | "desc";
  onSort?: (sortBy: "created_at" | "duration_seconds" | "unified_status", sortDir: "asc" | "desc") => void;
  density?: "compact" | "default" | "comfortable";
};

export default function PipelineTable({
  rows,
  pagination,
  isLoading,
  hasFilters,
  filters,
  onOpen,
  onClearFilters,
  onSetPage,
  onSetLimit,
  compareMode,
  compareSelection,
  onToggleCompareSelection,
  onOpenCompare,
  sortBy = "created_at",
  sortDir = "desc",
  onSort,
  density = "default",
}: Props) {
  const [jumpPage, setJumpPage] = useState("");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        hasFilters={hasFilters}
        filters={filters}
        total={pagination?.total ?? 0}
        onClearFilters={onClearFilters}
      />
    );
  }

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 1;

  // Generate page numbers: current ±2
  const pageNumbers: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pageNumbers.push(i);
  }

  const pipelineCardStyle: CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const compareBannerStyle: CSSProperties = {
    backgroundColor: "var(--bg-sunken)",
    border: "1px solid var(--border-light)",
    borderBottom: "1px solid var(--border-light)",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
  };

  const viewBtnStyle: CSSProperties = {
    padding: "6px 12px",
    backgroundColor: "var(--accent)",
    color: "var(--text-on-accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  };

  const tableHeadStyle: CSSProperties = {
    backgroundColor: "var(--bg-sunken)",
    borderBottom: "1px solid var(--border-light)",
  };

  const theadThStyle: CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--text-secondary)",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const tableBodyStyle: CSSProperties = {
    // table content
  };

  const paginationStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "16px 20px",
    borderTop: "1px solid var(--border-light)",
    backgroundColor: "var(--bg-sunken)",
    fontSize: "13px",
  };

  const paginationInfoStyle: CSSProperties = {
    color: "var(--text-secondary)",
    fontWeight: 500,
  };

  const paginationCenterStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const pageBtnStyle: CSSProperties = {
    padding: "6px 10px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all var(--transition-fast)",
  };

  const pageBtnActiveStyle: CSSProperties = {
    ...pageBtnStyle,
    backgroundColor: "var(--accent)",
    color: "var(--text-on-accent)",
    borderColor: "var(--accent)",
  };

  const pageBtnDisabledStyle: CSSProperties = {
    ...pageBtnStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  const pageJumpStyle: CSSProperties = {
    width: "60px",
    padding: "6px 10px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "center",
  };

  const paginationRightStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const summaryStyle: CSSProperties = {
    borderTop: "2px solid var(--border-light)",
    background: "var(--bg-sunken)",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  };

  const summaryItemStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "var(--text-secondary)",
  };

  const paginationShowLabelStyle: CSSProperties = {
    color: "var(--text-secondary)",
    fontWeight: 500,
  };

  const selectWrapSmStyle: CSSProperties = {
    position: "relative",
    width: "70px",
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    height: "32px",
    padding: "4px 8px 4px 8px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    appearance: "none",
    transition: "all var(--transition-fast)",
  };

  const selectArrowStyle: CSSProperties = {
    position: "absolute",
    right: "6px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  };

  const sortableHeaderStyle: CSSProperties = {
    ...theadThStyle,
    cursor: "pointer",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const sortIndicatorStyle = (column: string): CSSProperties => ({
    fontSize: "10px",
    opacity: sortBy === column ? 1 : 0.4,
    transition: "opacity var(--transition-fast)",
  });

  const getSortIndicator = (column: "created_at" | "duration_seconds" | "unified_status") => {
    if (sortBy !== column) {
      return "↕";
    }
    return sortDir === "asc" ? "↑" : "↓";
  };

  const durations = rows
    .map((row) => row.duration_seconds)
    .filter((value): value is number => typeof value === "number" && value >= 0);

  const avgDuration = durations.length === 0 ? 0 : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);

  const successCount = rows.filter((row) => row.unified_status === "success").length;
  const pageSuccessRate = rows.length === 0 ? 0 : Math.round((successCount / rows.length) * 100);
  const pageSuccessColor = pageSuccessRate > 80
    ? "var(--status-success-text)"
    : pageSuccessRate >= 50
      ? "var(--status-warning-text)"
      : "var(--status-failed-text)";

  const uniqueDeployers = new Set(rows.map((row) => row.triggered_by).filter(Boolean)).size;

  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div style={pipelineCardStyle}>
      {compareMode && (
        <div style={compareBannerStyle}>
          <span>Select exactly two deployments to compare ({compareSelection.length}/2 selected)</span>
          <button
            type="button"
            style={{
              ...viewBtnStyle,
              opacity: compareSelection.length !== 2 ? 0.5 : 1,
              cursor: compareSelection.length !== 2 ? "not-allowed" : "pointer",
            }}
            disabled={compareSelection.length !== 2}
            onClick={onOpenCompare}
          >
            Compare now
          </button>
        </div>
      )}

      <table style={tableStyle}>
        <thead style={tableHeadStyle}>
          <tr>
            {compareMode ? <th style={{ ...theadThStyle, width: 56 }}>Pick</th> : null}
            <th style={{ ...theadThStyle, width: 130 }}>Status</th>
            <th style={theadThStyle}>Repo</th>
            <th style={theadThStyle}>Branch / Commit</th>
            <th style={theadThStyle}>Environment</th>
            <th style={theadThStyle}>Triggered by</th>
            <th
              style={sortableHeaderStyle}
              onClick={() => {
                if (onSort) {
                  if (sortBy === "duration_seconds") {
                    onSort("duration_seconds", sortDir === "asc" ? "desc" : "asc");
                  } else {
                    onSort("duration_seconds", "desc");
                  }
                }
              }}
            >
              Duration
              <span style={sortIndicatorStyle("duration_seconds")}>
                {getSortIndicator("duration_seconds")}
              </span>
            </th>
            <th
              style={sortableHeaderStyle}
              onClick={() => {
                if (onSort) {
                  if (sortBy === "created_at") {
                    onSort("created_at", sortDir === "asc" ? "desc" : "asc");
                  } else {
                    onSort("created_at", "desc");
                  }
                }
              }}
            >
              Time
              <span style={sortIndicatorStyle("created_at")}>
                {getSortIndicator("created_at")}
              </span>
            </th>
            <th style={{ ...theadThStyle, width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody style={tableBodyStyle}>
          {rows.map((row) => (
            <DeploymentRow
              key={row.id}
              deployment={row}
              onOpen={onOpen}
              compareMode={compareMode}
              isSelectedForCompare={compareSelection.includes(row.id)}
              onToggleCompareSelection={onToggleCompareSelection}
                         density={density}
            />
          ))}
        </tbody>
      </table>

      <div style={summaryStyle}>
        <span style={summaryItemStyle}>
          <Clock3 size={12} color="var(--text-muted)" />
          Avg: {formatDuration(avgDuration)}
        </span>

        <span style={{ ...summaryItemStyle, color: pageSuccessColor }}>
          <CheckCircle2 size={12} color={pageSuccessColor} />
          {pageSuccessRate}% success
        </span>

        {durations.length >= 5 ? (
          <span style={summaryItemStyle}>
            <Timer size={12} color="var(--text-muted)" />
            Total: {formatDuration(totalDuration)}
          </span>
        ) : null}

        <span style={summaryItemStyle}>
          <Users size={12} color="var(--text-muted)" />
          {uniqueDeployers} deployers
        </span>
      </div>

      {pagination && (
        <div style={paginationStyle}>
          <span style={paginationInfoStyle}>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} deployments
          </span>

          <div style={paginationCenterStyle}>
            <button
              type="button"
              style={!pagination.hasPrev ? pageBtnDisabledStyle : pageBtnStyle}
              disabled={!pagination.hasPrev}
              onClick={() => onSetPage(pagination.page - 1)}
            >
              Prev
            </button>

            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                style={num === currentPage ? pageBtnActiveStyle : pageBtnStyle}
                onClick={() => onSetPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              style={!pagination.hasNext ? pageBtnDisabledStyle : pageBtnStyle}
              disabled={!pagination.hasNext}
              onClick={() => onSetPage(pagination.page + 1)}
            >
              Next
            </button>

            <input
              type="number"
              style={pageJumpStyle}
              placeholder="Go to"
              value={jumpPage}
              min={1}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = Number.parseInt(jumpPage, 10);
                  if (!Number.isNaN(num) && num > 0) {
                    onSetPage(num);
                    setJumpPage("");
                  }
                }
              }}
            />
          </div>

          <div style={paginationRightStyle}>
            <span style={paginationShowLabelStyle}>Show:</span>
            <div style={selectWrapSmStyle}>
              <select
                style={selectStyle}
                value={pagination.limit}
                onChange={(e) => onSetLimit(Number.parseInt(e.target.value, 10))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <svg style={selectArrowStyle} width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
