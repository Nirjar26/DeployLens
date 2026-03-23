export interface DeploymentSummary {
  id: string;
  full_name: string;
  owner: string;
  name: string;
}

export interface EnvironmentSummary {
  id: string;
  display_name: string;
  color_tag: string;
}

export interface DeploymentUpdatedEvent {
  type: "deployment:updated";
  deploymentId: string;
  unified_status: string;
  github_status: string | null;
  codedeploy_status: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  repository: DeploymentSummary;
  environment: EnvironmentSummary | null;
}

export interface DeploymentCreatedEvent {
  type: "deployment:created";
  deploymentId: string;
  unified_status: string;
  commit_sha: string | null;
  commit_sha_short: string | null;
  commit_message: string | null;
  branch: string | null;
  triggered_by: string | null;
  created_at: string;
  repository: DeploymentSummary;
  environment: EnvironmentSummary | null;
}

export interface StatsRefreshEvent {
  type: "stats:refresh";
  userId: string;
}

export interface ServerToClientEvents {
  "deployment:updated": (data: DeploymentUpdatedEvent) => void;
  "deployment:created": (data: DeploymentCreatedEvent) => void;
  "stats:refresh": (data: StatsRefreshEvent) => void;
}

export interface ClientToServerEvents {
  "watch:deployment": (deploymentId: string) => void;
  "unwatch:deployment": (deploymentId: string) => void;
}

export type SocketStatus = "connected" | "connecting" | "disconnected";
