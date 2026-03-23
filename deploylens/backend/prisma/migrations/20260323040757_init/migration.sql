-- CreateEnum
CREATE TYPE "UnifiedStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'rolled_back');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "github_user_id" TEXT NOT NULL,
    "github_username" TEXT NOT NULL,
    "github_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aws_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_key_id_enc" TEXT NOT NULL,
    "secret_key_enc" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_alias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aws_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "github_repo_id" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "codedeploy_app" TEXT NOT NULL,
    "codedeploy_group" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "color_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commit_message" TEXT,
    "triggered_by" TEXT,
    "github_run_id" TEXT,
    "github_status" TEXT,
    "github_run_url" TEXT,
    "codedeploy_id" TEXT,
    "codedeploy_status" TEXT,
    "unified_status" "UnifiedStatus" NOT NULL DEFAULT 'pending',
    "is_rollback" BOOLEAN NOT NULL DEFAULT false,
    "rolled_back_from_id" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_events" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "log_url" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "deployment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rollback_log" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "target_deployment_id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "rollback_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_jti_key" ON "refresh_tokens"("token_jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_connections_user_id_key" ON "github_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_connections_github_user_id_key" ON "github_connections"("github_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "aws_connections_user_id_key" ON "aws_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_github_repo_id_key" ON "repositories"("github_repo_id");

-- CreateIndex
CREATE INDEX "repositories_user_id_idx" ON "repositories"("user_id");

-- CreateIndex
CREATE INDEX "environments_user_id_idx" ON "environments"("user_id");

-- CreateIndex
CREATE INDEX "environments_repository_id_idx" ON "environments"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "environments_user_id_codedeploy_app_codedeploy_group_key" ON "environments"("user_id", "codedeploy_app", "codedeploy_group");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_github_run_id_key" ON "deployments"("github_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_codedeploy_id_key" ON "deployments"("codedeploy_id");

-- CreateIndex
CREATE INDEX "deployments_user_id_idx" ON "deployments"("user_id");

-- CreateIndex
CREATE INDEX "deployments_repository_id_idx" ON "deployments"("repository_id");

-- CreateIndex
CREATE INDEX "deployments_environment_id_idx" ON "deployments"("environment_id");

-- CreateIndex
CREATE INDEX "deployments_commit_sha_idx" ON "deployments"("commit_sha");

-- CreateIndex
CREATE INDEX "deployment_events_deployment_id_idx" ON "deployment_events"("deployment_id");

-- CreateIndex
CREATE INDEX "rollback_log_deployment_id_idx" ON "rollback_log"("deployment_id");

-- CreateIndex
CREATE INDEX "rollback_log_target_deployment_id_idx" ON "rollback_log"("target_deployment_id");

-- CreateIndex
CREATE INDEX "rollback_log_initiated_by_idx" ON "rollback_log"("initiated_by");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aws_connections" ADD CONSTRAINT "aws_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_rolled_back_from_id_fkey" FOREIGN KEY ("rolled_back_from_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_events" ADD CONSTRAINT "deployment_events_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_log" ADD CONSTRAINT "rollback_log_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_log" ADD CONSTRAINT "rollback_log_target_deployment_id_fkey" FOREIGN KEY ("target_deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_log" ADD CONSTRAINT "rollback_log_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
