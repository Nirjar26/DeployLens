import { useState } from "react";
import { DeploymentRow as DeploymentRowType, PaginationInfo } from "../../store/deploymentStore";
import DeploymentRow from "./DeploymentRow";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";

type Props = {
  rows: DeploymentRowType[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  hasFilters: boolean;
  onOpen: (id: string) => void;
  onClearFilters: () => void;
  onSetPage: (page: number) => void;
  onSetLimit: (limit: number) => void;
  compareMode: boolean;
  compareSelection: string[];
  onToggleCompareSelection: (id: string) => void;
  onOpenCompare: () => void;
};

export default function PipelineTable({
  rows,
  pagination,
  isLoading,
  hasFilters,
  onOpen,
  onClearFilters,
  onSetPage,
  onSetLimit,
  compareMode,
  compareSelection,
  onToggleCompareSelection,
  onOpenCompare,
}: Props) {
  const [jumpPage, setJumpPage] = useState("");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (rows.length === 0) {
    return <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />;
  }

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 1;

  // Generate page numbers: current ±2
  const pageNumbers: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="dl-pipeline-card">
      {compareMode && (
        <div className="dl-compare-banner">
          <span>Select exactly two deployments to compare ({compareSelection.length}/2 selected)</span>
          <button
            type="button"
            className="dl-view-btn"
            disabled={compareSelection.length !== 2}
            onClick={onOpenCompare}
          >
            Compare now
          </button>
        </div>
      )}

      <table className="dl-pipeline-table">
        <thead>
          <tr>
            {compareMode ? <th style={{ width: 56 }}>Pick</th> : null}
            <th style={{ width: 130 }}>Status</th>
            <th>Repo</th>
            <th>Branch / Commit</th>
            <th>Environment</th>
            <th>Triggered by</th>
            <th>Duration</th>
            <th>Time</th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DeploymentRow
              key={row.id}
              deployment={row}
              onOpen={onOpen}
              compareMode={compareMode}
              isSelectedForCompare={compareSelection.includes(row.id)}
              onToggleCompareSelection={onToggleCompareSelection}
            />
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="dl-pagination">
          <span className="dl-pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} deployments
          </span>

          <div className="dl-pagination-center">
            <button
              type="button"
              className="dl-page-btn"
              disabled={!pagination.hasPrev}
              onClick={() => onSetPage(pagination.page - 1)}
            >
              Prev
            </button>

            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                className={`dl-page-btn ${num === currentPage ? "dl-page-btn-active" : ""}`}
                onClick={() => onSetPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              className="dl-page-btn"
              disabled={!pagination.hasNext}
              onClick={() => onSetPage(pagination.page + 1)}
            >
              Next
            </button>

            <input
              type="number"
              className="dl-page-jump"
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

          <div className="dl-pagination-right">
            <span className="dl-pagination-show-label">Show:</span>
            <div className="dl-select-wrap dl-select-wrap-sm">
              <select
                className="dl-filter-select"
                value={pagination.limit}
                onChange={(e) => onSetLimit(Number.parseInt(e.target.value, 10))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <svg className="dl-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
