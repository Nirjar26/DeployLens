export type AwsConnectInput = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  accountAlias?: string;
};

export type NormalizedCodeDeployDeployment = {
  codedeploy_id: string;
  app_name: string;
  group_name: string;
  status: string;
  commit_sha: string | null;
  create_time: string;
  complete_time: string | null;
  duration_seconds: number | null;
  error_code: string | null;
  error_message: string | null;
  overview: {
    pending: number;
    in_progress: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
};

export type NormalizedDeploymentEvent = {
  event_name: string;
  status: string;
  message: string | null;
  log_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
};
