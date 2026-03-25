import { CSSProperties, useMemo } from "react";
import { useDeploymentStore, DeploymentStats } from "../../store/deploymentStore";

type ChipType = "all" | "pending" | "running" | "success" | "failed" | "rolled_back";

type Props = {
  stats: DeploymentStats | null;
};

export default function StatusFilterChips({ stats }: Props) {
  const filters = useDeploymentStore((state) => state.filters);
  const setFilter = useDeploymentStore((state) => state.setFilter);

  const statusCounts = useMemo(
    () => stats?.by_status || { pending: 0, running: 0, success: 0, failed: 0, rolled_back: 0, total: 0 },
    [stats]
  );

  const activeChip = (filters.status as ChipType) || "all";

  const handleChipClick = async (chip: ChipType) => {
    if (chip === "all") {
      await setFilter("status", "");
    } else if (activeChip === chip) {
      await setFilter("status", "");
    } else {
      await setFilter("status", chip);
    }
  };

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "12px",
    flexWrap: "wrap",
  };

  const getChipStyle = (chip: ChipType, isActive: boolean): CSSProperties => {
    const baseStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      height: "28px",
      padding: "0 12px",
      border: "1px solid var(--border-light)",
      borderRadius: "var(--radius-full)",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all var(--transition-base)",
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
      userSelect: "none",
    };

    if (!isActive) {
      return { ...baseStyle, color: "var(--text-secondary)" };
    }

    // Active styles
    switch (chip) {
      case "pending":
        return {
          ...baseStyle,
          background: "var(--status-pending-bg)",
          color: "var(--status-pending-text)",
          borderColor: "var(--status-pending-border)",
        };
      case "running":
        return {
          ...baseStyle,
          background: "var(--status-running-bg)",
          color: "var(--status-running-text)",
          borderColor: "var(--status-running-border)",
        };
      case "success":
        return {
          ...baseStyle,
          background: "var(--status-success-bg)",
          color: "var(--status-success-text)",
          borderColor: "var(--status-success-border)",
        };
      case "failed":
        return {
          ...baseStyle,
          background: "var(--status-failed-bg)",
          color: "var(--status-failed-text)",
          borderColor: "var(--status-failed-border)",
        };
      case "rolled_back":
        return {
          ...baseStyle,
          background: "var(--status-rolledback-bg)",
          color: "var(--status-rolledback-text)",
          borderColor: "var(--status-rolledback-border)",
        };
      default:
        return {
          ...baseStyle,
          background: "var(--text-primary)",
          color: "var(--text-on-accent)",
          borderColor: "var(--text-primary)",
        };
    }
  };

  const getDotStyle = (chip: ChipType): CSSProperties => {
    const dotStyle: CSSProperties = {
      display: "inline-block",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      marginRight: "-2px",
    };

    switch (chip) {
      case "pending":
        return { ...dotStyle, backgroundColor: "var(--status-pending-text)" };
      case "running":
        return {
          ...dotStyle,
          backgroundColor: "var(--status-running-text)",
          animation: "spin 2s linear infinite",
        };
      case "success":
        return { ...dotStyle, backgroundColor: "var(--status-success-text)" };
      case "failed":
        return { ...dotStyle, backgroundColor: "var(--status-failed-text)" };
      case "rolled_back":
        return { ...dotStyle, backgroundColor: "var(--status-rolledback-text)" };
      default:
        return dotStyle;
    }
  };

  const countBadgeStyle: CSSProperties = {
    background: "var(--bg-sunken)",
    borderRadius: "var(--radius-full)",
    padding: "0 6px",
    fontSize: "10px",
    fontWeight: 700,
    minWidth: "18px",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* All chip */}
      <button
        style={getChipStyle("all", activeChip === "all")}
        onClick={() => void handleChipClick("all")}
      >
        All
        <span style={countBadgeStyle}>{statusCounts.total}</span>
      </button>

      {/* Pending chip */}
      <button
        style={getChipStyle("pending", activeChip === "pending")}
        onClick={() => void handleChipClick("pending")}
      >
        <span style={getDotStyle("pending")} />
        Pending
        <span style={countBadgeStyle}>{statusCounts.pending}</span>
      </button>

      {/* Running chip */}
      <button
        style={getChipStyle("running", activeChip === "running")}
        onClick={() => void handleChipClick("running")}
      >
        <span style={getDotStyle("running")} />
        Running
        <span style={countBadgeStyle}>{statusCounts.running}</span>
      </button>

      {/* Success chip */}
      <button
        style={getChipStyle("success", activeChip === "success")}
        onClick={() => void handleChipClick("success")}
      >
        <span style={getDotStyle("success")} />
        Success
        <span style={countBadgeStyle}>{statusCounts.success}</span>
      </button>

      {/* Failed chip */}
      <button
        style={getChipStyle("failed", activeChip === "failed")}
        onClick={() => void handleChipClick("failed")}
      >
        <span style={getDotStyle("failed")} />
        Failed
        <span style={countBadgeStyle}>{statusCounts.failed}</span>
      </button>

      {/* Rolled back chip */}
      <button
        style={getChipStyle("rolled_back", activeChip === "rolled_back")}
        onClick={() => void handleChipClick("rolled_back")}
      >
        <span style={getDotStyle("rolled_back")} />
        Rolled back
        <span style={countBadgeStyle}>{statusCounts.rolled_back}</span>
      </button>
    </div>
  );
}
