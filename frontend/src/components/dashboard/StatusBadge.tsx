import { CSSProperties } from "react";
import { CheckCircle2, Clock3, Loader2, RotateCcw, XCircle } from "lucide-react";

type Props = {
  status: "pending" | "running" | "success" | "failed" | "rolled_back";
  size?: "xs" | "sm" | "md" | "lg";
};

const statusConfig: Record<
  Props["status"],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--status-pending)",
    bgColor: "rgba(100, 116, 139, 0.08)",
    borderColor: "var(--status-pending)",
  },
  running: {
    label: "Running",
    color: "var(--status-running)",
    bgColor: "rgba(37, 99, 235, 0.08)",
    borderColor: "var(--status-running)",
  },
  success: {
    label: "Success",
    color: "var(--status-success)",
    bgColor: "rgba(22, 163, 74, 0.08)",
    borderColor: "var(--status-success)",
  },
  failed: {
    label: "Failed",
    color: "var(--status-failed)",
    bgColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "var(--status-failed)",
  },
  rolled_back: {
    label: "Rolled back",
    color: "var(--status-rolled-back)",
    bgColor: "rgba(234, 88, 12, 0.08)",
    borderColor: "var(--status-rolled-back)",
  },
};

function StatusIcon({ status, size }: { status: Props["status"]; size: number }) {
  const color = statusConfig[status].color;

  if (status === "pending") return <Clock3 size={size} color={color} />;
  if (status === "running")
    return <Loader2 size={size} color={color} style={{ animation: "spin 1.5s linear infinite" }} />;
  if (status === "success") return <CheckCircle2 size={size} color={color} />;
  if (status === "failed") return <XCircle size={size} color={color} />;
  return <RotateCcw size={size} color={color} />;
}

export default function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  const iconSize = size === "xs" ? 10 : size === "sm" ? 12 : size === "lg" ? 14 : 12;

  if (size === "xs") {
    const dotStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "var(--radius-full)",
      backgroundColor: config.bgColor,
      border: `1px solid ${config.borderColor}`,
    };

    return (
      <span style={dotStyle}>
        <StatusIcon status={status} size={iconSize} />
      </span>
    );
  }

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding:
      size === "sm"
        ? "4px 10px"
        : size === "lg"
          ? "8px 14px"
          : "6px 12px",
    borderRadius: "var(--radius-md)",
    backgroundColor: config.bgColor,
    border: `1px solid ${config.borderColor}`,
    color: config.color,
    fontSize:
      size === "sm"
        ? "12px"
        : size === "lg"
          ? "14px"
          : "13px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  return (
    <span style={badgeStyle}>
      <StatusIcon status={status} size={iconSize} />
      {config.label}
    </span>
  );
}
