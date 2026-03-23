import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";

type Props = {
  status: "pending" | "running" | "success" | "failed" | "rolled_back";
  size?: "sm" | "md" | "lg";
};

function statusLabel(status: Props["status"]): string {
  if (status === "pending") return "Pending";
  if (status === "running") return "Running";
  if (status === "success") return "Success";
  if (status === "failed") return "Failed";
  return "Rolled back";
}

function statusClass(status: Props["status"]): string {
  if (status === "pending") return "status-pending";
  if (status === "running") return "status-running";
  if (status === "success") return "status-success";
  if (status === "failed") return "status-failed";
  return "status-rolled";
}

function StatusIcon({ status }: { status: Props["status"] }) {
  if (status === "pending") return <Clock3 size={14} />;
  if (status === "running") return <RotateCcw size={14} className="spin-inline" />;
  if (status === "success") return <CheckCircle2 size={14} />;
  if (status === "failed") return <XCircle size={14} />;
  return <RotateCcw size={14} />;
}

export default function StatusBadge({ status, size = "md" }: Props) {
  return (
    <span className={`status-badge ${statusClass(status)} status-${size}`}>
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  );
}
