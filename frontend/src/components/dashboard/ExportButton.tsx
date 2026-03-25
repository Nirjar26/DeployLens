import { CSSProperties, useState } from "react";
import { Download } from "lucide-react";
import { DeploymentFilters, DeploymentRow } from "../../store/deploymentStore";
import { deployments } from "../../lib/api";

type Props = {
  filters: DeploymentFilters;
};

export default function ExportButton({ filters }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Fetch all deployments with current filters but with high limit
      const response = await deployments.list({
        repo: filters.repo,
        environment: filters.environment,
        status: filters.status,
        branch: filters.branch,
        from: filters.from,
        to: filters.to,
        triggered_by: filters.triggered_by,
        sort_by: filters.sortBy,
        sort_dir: filters.sortDir,
        limit: 1000,
        page: 1,
      });

      if (!response.deployments || response.deployments.length === 0) {
        alert("No deployments to export");
        setIsLoading(false);
        return;
      }

      // Generate CSV
      const headers = [
        "ID",
        "Repository",
        "Branch",
        "Commit",
        "Commit Message",
        "Environment",
        "Status",
        "Triggered By",
        "Started At",
        "Finished At",
        "Duration (seconds)",
      ];

      const rows = response.deployments.map((d: DeploymentRow) => [
        d.id,
        d.repository?.full_name ?? "",
        d.branch ?? "",
        d.commit_sha_short ?? "",
        (d.commit_message ?? "").replace(/,/g, ";"),
        d.environment?.display_name ?? "",
        d.unified_status,
        d.triggered_by ?? "",
        d.started_at ?? "",
        d.finished_at ?? "",
        d.duration_seconds ?? "",
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              // Escape cells that contain commas or quotes
              if (typeof cell === "string" && (cell.includes(",") || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            })
            .join(",")
        )
        .join("\n");

      // Create and download file
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deploylens-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export deployments");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle: CSSProperties = {
    height: "32px",
    padding: "0 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    opacity: isLoading ? 0.6 : 1,
  };

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={() => void handleExport()}
      disabled={isLoading}
      title="Export deployments to CSV"
    >
      <Download size={13} />
      {isLoading ? "Exporting..." : "Export"}
    </button>
  );
}
