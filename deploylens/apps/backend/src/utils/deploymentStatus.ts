import { Deployment, UnifiedStatus } from "@prisma/client";

export function isTerminalStatus(status: UnifiedStatus): boolean {
  return status === "success" || status === "failed" || status === "rolled_back";
}

export function isActiveStatus(status: UnifiedStatus): boolean {
  return status === "pending" || status === "running";
}

export function statusToLabel(status: UnifiedStatus): string {
  if (status === "pending") return "Pending";
  if (status === "running") return "In Progress";
  if (status === "success") return "Success";
  if (status === "failed") return "Failed";
  return "Rolled Back";
}

export function statusToColor(status: UnifiedStatus): string {
  if (status === "pending") return "#6b7280";
  if (status === "running") return "#3b82f6";
  if (status === "success") return "#22c55e";
  if (status === "failed") return "#ef4444";
  return "#f97316";
}

export function calculateDuration(startedAt: Date, finishedAt: Date | null): string {
  const end = finishedAt ?? new Date();
  const diff = Math.max(0, end.getTime() - startedAt.getTime());

  const seconds = Math.floor(diff / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  const rendered = parts.join(" ");
  return finishedAt ? rendered : `${rendered} ago`;
}

type DeploymentWithEnvironment = Deployment & {
  environment?: {
    display_name: string;
  } | null;
  environment_id?: string | null;
};

export function groupDeploymentsByEnvironment(deployments: DeploymentWithEnvironment[]): Record<string, DeploymentWithEnvironment[]> {
  const grouped: Record<string, DeploymentWithEnvironment[]> = {};

  for (const deployment of deployments) {
    const key = deployment.environment?.display_name ?? "__unassigned";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(deployment);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  return grouped;
}

export function getLatestPerEnvironment(deployments: DeploymentWithEnvironment[]): Record<string, DeploymentWithEnvironment> {
  const grouped = groupDeploymentsByEnvironment(deployments);
  const latest: Record<string, DeploymentWithEnvironment> = {};

  for (const key of Object.keys(grouped)) {
    const first = grouped[key][0];
    if (first) {
      latest[key] = first;
    }
  }

  return latest;
}
