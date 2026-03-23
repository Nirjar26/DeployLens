import { GetDeploymentCommand } from "@aws-sdk/client-codedeploy";
import { UnifiedStatus } from "@prisma/client";
import { createGithubClient } from "../../utils/githubClient";
import { decrypt } from "../../utils/encryption";
import { getCodeDeployClient } from "../../utils/awsClient";
import { calculateUnifiedStatus } from "../../utils/unifiedStatus";
import { emitDeploymentUpdate } from "../../utils/emitDeploymentUpdate";
import { AggregatorRunResult, AggregatorStatus, MergeCandidate } from "./aggregator.types";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const lastRunByUser = new Map<string, string>();
let lastGlobalRun: string | null = null;

function isTerminal(status: UnifiedStatus): boolean {
  return status === "success" || status === "failed" || status === "rolled_back";
}

function mapCodeDeployStatus(status: string | undefined): string | null {
  if (!status) return null;
  return status;
}

function mapGithubStatus(run: any): string | null {
  if (!run) return null;
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "failure") return "failure";
  if (run.conclusion === "cancelled") return "cancelled";
  return run.status ?? null;
}

function shouldUseSecondaryForGithubFields(primary: MergeCandidate, secondary: MergeCandidate): boolean {
  return !primary.github_run_id && !!secondary.github_run_id;
}

function shouldUseSecondaryForCodedeployFields(primary: MergeCandidate, secondary: MergeCandidate): boolean {
  return !primary.codedeploy_id && !!secondary.codedeploy_id;
}

function pickPrimary(a: MergeCandidate, b: MergeCandidate): { primary: MergeCandidate; secondary: MergeCandidate } {
  if (a.created_at.getTime() <= b.created_at.getTime()) {
    return { primary: a, secondary: b };
  }

  return { primary: b, secondary: a };
}

async function migrateEvents(tx: any, primaryId: string, secondaryId: string): Promise<void> {
  const secondaryEvents = await tx.deploymentEvent.findMany({
    where: { deployment_id: secondaryId },
  });

  if (secondaryEvents.length === 0) {
    return;
  }

  const primaryKeys = new Set<string>();
  const existingPrimaryEvents = await tx.deploymentEvent.findMany({
    where: { deployment_id: primaryId },
    select: {
      source: true,
      event_name: true,
    },
  });

  for (const event of existingPrimaryEvents) {
    primaryKeys.add(`${event.source}:${event.event_name}`);
  }

  const toCreate = secondaryEvents
    .filter((event: any) => !primaryKeys.has(`${event.source}:${event.event_name}`))
    .map((event: any) => ({
      deployment_id: primaryId,
      source: event.source,
      event_name: event.event_name,
      status: event.status,
      message: event.message,
      log_url: event.log_url,
      started_at: event.started_at,
      ended_at: event.ended_at,
      duration_ms: event.duration_ms,
    }));

  if (toCreate.length > 0) {
    await tx.deploymentEvent.createMany({ data: toCreate });
  }

  await tx.deploymentEvent.deleteMany({ where: { deployment_id: secondaryId } });
}

export async function mergeDeploymentRows(githubRow: MergeCandidate, codedeployRow: MergeCandidate) {
  const { primary, secondary } = pickPrimary(githubRow, codedeployRow);

  if (primary.id === secondary.id) {
    return primary;
  }

  const mergedData: any = {};

  if (shouldUseSecondaryForCodedeployFields(primary, secondary)) {
    mergedData.codedeploy_id = secondary.codedeploy_id;
    mergedData.codedeploy_status = secondary.codedeploy_status;
    if (secondary.environment_id) mergedData.environment_id = secondary.environment_id;
    if (secondary.finished_at) mergedData.finished_at = secondary.finished_at;
    if (secondary.duration_seconds !== null) mergedData.duration_seconds = secondary.duration_seconds;
  }

  if (shouldUseSecondaryForGithubFields(primary, secondary)) {
    mergedData.github_run_id = secondary.github_run_id;
    mergedData.github_status = secondary.github_status;
    mergedData.github_run_url = secondary.github_run_url;
    if (!primary.branch || primary.branch === "unknown") mergedData.branch = secondary.branch;
    if (!primary.commit_message) mergedData.commit_message = secondary.commit_message;
    if (!primary.triggered_by) mergedData.triggered_by = secondary.triggered_by;
  }

  const nextGithubStatus = mergedData.github_status ?? primary.github_status;
  const nextCodeDeployStatus = mergedData.codedeploy_status ?? primary.codedeploy_status;
  mergedData.unified_status = calculateUnifiedStatus(nextGithubStatus, nextCodeDeployStatus, primary.is_rollback);

  const updatedPrimary = await prisma.$transaction(async (tx: any) => {
    await migrateEvents(tx, primary.id, secondary.id);

    const updated = await tx.deployment.update({
      where: { id: primary.id },
      data: mergedData,
    });

    await tx.deployment.delete({ where: { id: secondary.id } });

    return updated;
  });

  console.log(JSON.stringify({
    event: "deployment_merged",
    primaryId: updatedPrimary.id,
    secondaryId: secondary.id,
    commitSha: updatedPrimary.commit_sha,
    unifiedStatus: updatedPrimary.unified_status,
  }));

  void emitDeploymentUpdate(updatedPrimary.id, false).catch((err) => {
    console.error("Failed to emit deployment socket update after merge:", err);
  });

  return updatedPrimary;
}

async function processUnlinkedRowsForUser(userId: string): Promise<number> {
  let mergedCount = 0;
  const processedIds = new Set<string>();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const githubOnlyRows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      github_run_id: { not: null },
      codedeploy_id: null,
      commit_sha: { not: null },
      NOT: { commit_sha: "" },
      unified_status: { notIn: ["success", "failed", "rolled_back"] },
      created_at: { gte: since24h },
    },
    orderBy: { created_at: "desc" },
  });

  const codedeployOnlyRows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      codedeploy_id: { not: null },
      github_run_id: null,
      commit_sha: { not: null },
      NOT: { commit_sha: "" },
      created_at: { gte: since24h },
    },
    orderBy: { created_at: "desc" },
  });

  for (const githubRow of githubOnlyRows) {
    if (!githubRow.commit_sha || processedIds.has(githubRow.id)) continue;

    const matchingCodeDeploy = await prisma.deployment.findFirst({
      where: {
        user_id: userId,
        commit_sha: githubRow.commit_sha,
        codedeploy_id: { not: null },
        github_run_id: null,
        id: { not: githubRow.id },
      },
      orderBy: { created_at: "desc" },
    });

    if (!matchingCodeDeploy || processedIds.has(matchingCodeDeploy.id)) continue;

    await mergeDeploymentRows(githubRow, matchingCodeDeploy);
    processedIds.add(githubRow.id);
    processedIds.add(matchingCodeDeploy.id);
    mergedCount += 1;
  }

  for (const codeRow of codedeployOnlyRows) {
    if (!codeRow.commit_sha || processedIds.has(codeRow.id)) continue;

    const matchingGithub = await prisma.deployment.findFirst({
      where: {
        user_id: userId,
        commit_sha: codeRow.commit_sha,
        github_run_id: { not: null },
        codedeploy_id: null,
        id: { not: codeRow.id },
      },
      orderBy: { created_at: "desc" },
    });

    if (!matchingGithub || processedIds.has(matchingGithub.id)) continue;

    await mergeDeploymentRows(matchingGithub, codeRow);
    processedIds.add(codeRow.id);
    processedIds.add(matchingGithub.id);
    mergedCount += 1;
  }

  return mergedCount;
}

async function processOrphanedGithubRuns(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const orphaned = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      github_run_id: { not: null },
      codedeploy_id: null,
      github_status: "success",
      unified_status: "pending",
      created_at: { lt: cutoff },
    },
    select: { id: true },
  });

  for (const row of orphaned) {
    await prisma.deployment.update({
      where: { id: row.id },
      data: { unified_status: "success" },
    });

    void emitDeploymentUpdate(row.id, false).catch((err) => {
      console.error("Failed to emit deployment socket update for orphaned GitHub run:", err);
    });
  }

  return orphaned.length;
}

async function correctStaleRunningRows(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  let corrected = 0;

  const staleRows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      unified_status: "running",
      started_at: { lt: cutoff },
      finished_at: null,
    },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
        },
      },
    },
  });

  for (const row of staleRows) {
    try {
      if (row.codedeploy_id) {
        const client = await getCodeDeployClient(userId);
        const detail = await client.send(new GetDeploymentCommand({ deploymentId: row.codedeploy_id }));
        const codedeployStatus = mapCodeDeployStatus(detail.deploymentInfo?.status);

        if (codedeployStatus) {
          await prisma.deployment.update({
            where: { id: row.id },
            data: {
              codedeploy_status: codedeployStatus,
              unified_status: calculateUnifiedStatus(row.github_status ?? null, codedeployStatus, row.is_rollback),
              finished_at: codedeployStatus === "Succeeded" || codedeployStatus === "Failed" || codedeployStatus === "Stopped"
                ? (detail.deploymentInfo?.completeTime ?? new Date())
                : null,
            },
          });

          corrected += 1;
          void emitDeploymentUpdate(row.id, false).catch((err) => {
            console.error("Failed to emit deployment socket update for stale CodeDeploy row:", err);
          });
        }

        continue;
      }

      if (row.github_run_id && row.repository) {
        const connection = await prisma.githubConnection.findUnique({
          where: { user_id: userId },
          select: { access_token_enc: true },
        });

        if (!connection) continue;

        const github = createGithubClient(decrypt(connection.access_token_enc), userId);
        const runResponse = await github.get(`/repos/${row.repository.owner}/${row.repository.name}/actions/runs/${row.github_run_id}`);
        const githubStatus = mapGithubStatus(runResponse.data);

        if (githubStatus) {
          await prisma.deployment.update({
            where: { id: row.id },
            data: {
              github_status: githubStatus,
              unified_status: calculateUnifiedStatus(githubStatus, row.codedeploy_status ?? null, row.is_rollback),
            },
          });

          corrected += 1;
          void emitDeploymentUpdate(row.id, false).catch((err) => {
            console.error("Failed to emit deployment socket update for stale GitHub row:", err);
          });
        }
      }
    } catch {
      // continue with remaining stale rows
     }
   }

   return corrected;
 }

async function recalculatePendingJoinedRows(userId: string): Promise<void> {
  const pendingRows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      unified_status: "pending",
      github_status: { not: null },
      codedeploy_status: { not: null },
    },
    select: {
      id: true,
      github_status: true,
      codedeploy_status: true,
      is_rollback: true,
    },
  });

  for (const row of pendingRows) {
    const nextStatus = calculateUnifiedStatus(row.github_status, row.codedeploy_status, row.is_rollback);
    await prisma.deployment.update({
      where: { id: row.id },
      data: { unified_status: nextStatus },
    });
  }
}

function createStatusMap(): Record<UnifiedStatus, number> {
  return {
    pending: 0,
    running: 0,
    success: 0,
    failed: 0,
    rolled_back: 0,
  };
}

export async function getAggregatorStatus(userId: string): Promise<AggregatorStatus> {
  const [total, githubOnly, codedeployOnly, fullyJoined, grouped] = await Promise.all([
    prisma.deployment.count({ where: { user_id: userId } }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        github_run_id: { not: null },
        codedeploy_id: null,
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        codedeploy_id: { not: null },
        github_run_id: null,
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        github_run_id: { not: null },
        codedeploy_id: { not: null },
      },
    }),
    prisma.deployment.groupBy({
      by: ["unified_status"],
      where: { user_id: userId },
      _count: {
        _all: true,
      },
    }),
  ]);

  const byStatus = createStatusMap();
  for (const item of grouped) {
    const status = item.unified_status as UnifiedStatus;
    byStatus[status] = item._count._all;
  }

  return {
    total,
    byStatus,
    githubOnly,
    codedeployOnly,
    fullyJoined,
    lastAggregatorRun: lastRunByUser.get(userId) ?? lastGlobalRun,
  };
}

async function getTargetUserIds(userId?: string): Promise<string[]> {
  if (userId) {
    return [userId];
  }

  const users = await prisma.deployment.findMany({
    distinct: ["user_id"],
    select: { user_id: true },
  });

  return users.map((entry: { user_id: string }) => entry.user_id);
}

export async function runAggregator(userId?: string): Promise<AggregatorRunResult> {
  const startTime = Date.now();
  let mergedCount = 0;
  let orphanedCount = 0;
  let staleCorrectedCount = 0;

  const userIds = await getTargetUserIds(userId);

  for (const targetUserId of userIds) {
    mergedCount += await processUnlinkedRowsForUser(targetUserId);
    orphanedCount += await processOrphanedGithubRuns(targetUserId);
    staleCorrectedCount += await correctStaleRunningRows(targetUserId);
    await recalculatePendingJoinedRows(targetUserId);
    lastRunByUser.set(targetUserId, new Date().toISOString());
  }

  const durationMs = Date.now() - startTime;
  lastGlobalRun = new Date().toISOString();

  console.log(JSON.stringify({
    event: "aggregator_run",
    userId: userId ?? "all",
    merged: mergedCount,
    orphaned: orphanedCount,
    staleFixed: staleCorrectedCount,
    durationMs,
  }));

  return {
    mergedCount,
    orphanedCount,
    staleCorrectedCount,
    durationMs,
  };
}
