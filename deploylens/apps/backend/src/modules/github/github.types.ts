export interface GithubOauthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GithubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string | null;
}

export interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  default_branch: string;
  updated_at: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
}

export interface GithubWorkflowRun {
  id: number;
  head_sha: string;
  head_branch: string;
  html_url: string;
  event: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  name: string;
  actor: {
    login: string;
  };
  head_commit: {
    message: string;
  } | null;
}

export interface GithubWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GithubWorkflowRun[];
}
