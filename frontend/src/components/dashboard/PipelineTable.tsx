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
}: Props) {
  const [jumpPage, setJumpPage] = useState("");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (rows.length === 0) {
    return <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="pipeline-wrap">
      <table className="pipeline-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Repo</th>
            <th>Branch / Commit</th>
            <th>Environment</th>
            <th>Triggered by</th>
            <th>Duration</th>
            <th>Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DeploymentRow key={row.id} deployment={row} onOpen={onOpen} />
          ))}
        </tbody>
      </table>

      {pagination ? (
        <div className="pagination-bar">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} deployments
          </span>
          <div className="pagination-controls">
            <button type="button" className="auth-btn auth-btn-secondary" disabled={!pagination.hasPrev} onClick={() => onSetPage(pagination.page - 1)}>Prev</button>
            <input
              type="number"
              min={1}
              className="auth-input page-input"
              placeholder={String(pagination.page)}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = Number.parseInt(jumpPage, 10);
                  if (!Number.isNaN(num) && num > 0) {
                    onSetPage(num);
                  }
                }
              }}
            />
            <button type="button" className="auth-btn auth-btn-secondary" disabled={!pagination.hasNext} onClick={() => onSetPage(pagination.page + 1)}>Next</button>
            <select className="auth-input limit-select" value={pagination.limit} onChange={(e) => onSetLimit(Number.parseInt(e.target.value, 10))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
