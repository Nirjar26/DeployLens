import { CheckCircle2, Clock3, Loader2, RotateCcw, XCircle } from "lucide-react";

type Props = {
  status: "pending" | "running" | "success" | "failed" | "rolled_back";
  size?: "xs" | "sm" | "md" | "lg";
};

const statusConfig: Record<
  Props["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "dl-status-pending" },
  running: { label: "Running", className: "dl-status-running" },
  success: { label: "Success", className: "dl-status-success" },
  failed: { label: "Failed", className: "dl-status-failed" },
  rolled_back: { label: "Rolled back", className: "dl-status-rolled" },
};

function StatusIcon({ status, size }: { status: Props["status"]; size: number }) {
  if (status === "pending") return <Clock3 size={size} />;
  if (status === "running") return <Loader2 size={size} className="dl-spin" />;
  if (status === "success") return <CheckCircle2 size={size} />;
  if (status === "failed") return <XCircle size={size} />;
  return <RotateCcw size={size} />;
}

export default function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  const iconSize = size === "xs" ? 10 : size === "sm" ? 12 : size === "lg" ? 14 : 12;

  if (size === "xs") {
    return (
      <span className={`dl-status-dot ${config.className}`}>
        <StatusIcon status={status} size={iconSize} />
      </span>
    );
  }

  return (
    <span className={`dl-status-badge dl-status-${size} ${config.className}`}>
      <StatusIcon status={status} size={iconSize} />
      {config.label}
    </span>
  );
}
