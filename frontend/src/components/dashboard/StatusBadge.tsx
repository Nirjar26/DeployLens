import { CSSProperties } from "react";

type Props = {
  status: "pending" | "running" | "success" | "failed" | "rolled_back";
  size?: "xs" | "sm" | "md" | "lg";
};

const statusConfig: Record<
  Props["status"],
  { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--status-pending-text)",
    bgColor: "var(--status-pending-bg)",
    borderColor: "var(--status-pending-border)",
    dotColor: "var(--status-pending-text)",
  },
  running: {
    label: "Running",
    color: "var(--status-running-text)",
    bgColor: "var(--status-running-bg)",
    borderColor: "var(--status-running-border)",
    dotColor: "var(--status-running-text)",
  },
  success: {
    label: "Success",
    color: "var(--status-success-text)",
    bgColor: "var(--status-success-bg)",
    borderColor: "var(--status-success-border)",
    dotColor: "var(--status-success-text)",
  },
  failed: {
    label: "Failed",
    color: "var(--status-failed-text)",
    bgColor: "var(--status-failed-bg)",
    borderColor: "var(--status-failed-border)",
    dotColor: "var(--status-failed-text)",
  },
  rolled_back: {
    label: "Rolled back",
    color: "var(--status-rolledback-text)",
    bgColor: "var(--status-rolledback-bg)",
    borderColor: "var(--status-rolledback-border)",
    dotColor: "var(--status-rolledback-text)",
  },
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  const dimensions =
    size === "xs"
      ? { height: "22px", fontSize: "11px", padding: "0 8px 0 7px" }
      : size === "sm"
        ? { height: "24px", fontSize: "11px", padding: "0 9px 0 8px" }
        : size === "lg"
          ? { height: "28px", fontSize: "13px", padding: "0 11px 0 9px" }
          : { height: "26px", fontSize: "12px", padding: "0 10px 0 8px" };

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: dimensions.height,
    padding: dimensions.padding,
    borderRadius: "var(--radius-full)",
    backgroundColor: config.bgColor,
    border: `1px solid ${config.borderColor}`,
    color: config.color,
    fontSize: dimensions.fontSize,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const dotStyle: CSSProperties = {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
    backgroundColor: config.dotColor,
    animation: status === "running" ? "dl-status-pulse 1.4s ease infinite" : undefined,
  };

  return (
    <>
      <style>
        {"@keyframes dl-status-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }"}
      </style>
      <span style={badgeStyle}>
        <span style={dotStyle} />
        {config.label}
      </span>
    </>
  );
}
