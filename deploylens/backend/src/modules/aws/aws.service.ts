import {
  GetDeploymentCommand,
  GetDeploymentInstanceCommand,
  ListApplicationsCommand,
  ListDeploymentGroupsCommand,
  ListDeploymentInstancesCommand,
  ListDeploymentsCommand,
} from "@aws-sdk/client-codedeploy";
import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { z } from "zod";
import { encrypt } from "../../utils/encryption";
import { calculateUnifiedStatus } from "../../utils/unifiedStatus";
import { getCodeDeployClient, getSTSClient } from "../../utils/awsClient";
import { AwsConnectInput, NormalizedCodeDeployDeployment, NormalizedDeploymentEvent } from "./aws.types";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

export const awsConnectSchema = z.object({
  accessKeyId: z.string().min(16).max(128),
  secretAccessKey: z.string().min(1),
  region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/, "Invalid AWS region format"),
  accountAlias: z.string().optional(),
});

const appQuerySchema = z.object({
  app: z.string().min(1),
});

const deploymentQuerySchema = z.object({
  app: z.string().min(1),
  group: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function normalizeCodeDeployStatus(status: string | undefined): string {
  if (!status) return "Unknown";
  return status;
}

function toIso(dateValue?: Date): string | null {
  return dateValue ? dateValue.toISOString() : null;
}

function getDurationSeconds(start?: Date, end?: Date): number | null {
  if (!start || !end) return null;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

function normalizeDeployment(info: any, appName: string, groupName: string): NormalizedCodeDeployDeployment {
  const createTime = info.createTime as Date | undefined;
  const completeTime = info.completeTime as Date | undefined;
  return {
    codedeploy_id: info.deploymentId,
    app_name: info.applicationName ?? appName,
    group_name: info.deploymentGroupName ?? groupName,
    status: normalizeCodeDeployStatus(info.status),
    commit_sha: info.revision?.gitHubLocation?.commitId ?? info.revision?.s3Location?.key ?? null,
    create_time: toIso(createTime) ?? new Date().toISOString(),
    complete_time: toIso(completeTime),
    duration_seconds: getDurationSeconds(createTime, completeTime),
    error_code: info.errorInformation?.code ?? null,
    error_message: info.errorInformation?.message ?? null,
    overview: {
      pending: info.deploymentOverview?.Pending ?? 0,
      in_progress: info.deploymentOverview?.InProgress ?? 0,
      succeeded: info.deploymentOverview?.Succeeded ?? 0,
      failed: info.deploymentOverview?.Failed ?? 0,
      skipped: info.deploymentOverview?.Skipped ?? 0,
    },
  };
}

async function getMappedEnvironment(userId: string, appName: string, groupName: string) {
  return prisma.environment.findFirst({
    where: {
      user_id: userId,
      codedeploy_app: appName,
      codedeploy_group: groupName,
    },
    include: {
      repository: {
        select: {
          id: true,
        },
      },
    },
  });
}

function isTerminalCodeDeployStatus(status: string) {
  return status === "Succeeded" || status === "Failed" || status === "Stopped";
}

export async function assertAwsConnected(userId: string): Promise<void> {
  const connection = await prisma.awsConnection.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!connection) {
    throw new Error("AWS_NOT_CONNECTED");
  }
}

export async function connectAwsCredentials(userId: string, input: AwsConnectInput) {
  const sts = await getSTSClient(input.accessKeyId, input.secretAccessKey, input.region);

  let identity;
  try {
    identity = await sts.send(new GetCallerIdentityCommand({}));
  } catch {
    throw new Error("AWS_INVALID_CREDENTIALS");
  }

  const accountId = identity.Account;
  if (!accountId) {
    throw new Error("AWS_INVALID_CREDENTIALS");
  }

  await prisma.awsConnection.upsert({
    where: { user_id: userId },
    update: {
      access_key_id_enc: encrypt(input.accessKeyId),
      secret_key_enc: encrypt(input.secretAccessKey),
      region: input.region,
      account_id: accountId,
      account_alias: input.accountAlias ?? null,
      connected_at: new Date(),
    },
    create: {
      user_id: userId,
      access_key_id_enc: encrypt(input.accessKeyId),
      secret_key_enc: encrypt(input.secretAccessKey),
      region: input.region,
      account_id: accountId,
      account_alias: input.accountAlias ?? null,
    },
  });

  return {
    accountId,
    accountAlias: input.accountAlias ?? null,
    region: input.region,
    connected: true,
  };
}

export async function getAwsStatus(userId: string) {
  const connection = await prisma.awsConnection.findUnique({
    where: { user_id: userId },
    select: {
      account_id: true,
      account_alias: true,
      region: true,
      connected_at: true,
    },
  });

  if (!connection) {
    return { connected: false };
  }

  return {
    connected: true,
    accountId: connection.account_id,
    accountAlias: connection.account_alias,
    region: connection.region,
    connected_at: connection.connected_at,
  };
}

export async function disconnectAws(userId: string) {
  await prisma.awsConnection.deleteMany({
    where: { user_id: userId },
  });

  return { success: true };
}

export function parseAppQuery(input: unknown) {
  return appQuerySchema.parse(input);
}

export function parseDeploymentQuery(input: unknown) {
  return deploymentQuerySchema.parse(input);
}

export async function listApplications(userId: string) {
  const client = await getCodeDeployClient(userId);
  const applications: string[] = [];
  let nextToken: string | undefined;

  while (true) {
    const result = await client.send(new ListApplicationsCommand({ nextToken }));
    applications.push(...(result.applications ?? []));

    if (!result.nextToken) break;
    nextToken = result.nextToken;
  }

  return applications;
}

export async function listDeploymentGroups(userId: string, appName: string) {
  const client = await getCodeDeployClient(userId);
  const result = await client.send(new ListDeploymentGroupsCommand({ applicationName: appName }));
  return result.deploymentGroups ?? [];
}

async function upsertDeploymentEvent(deploymentId: string, event: NormalizedDeploymentEvent) {
  const existing = await prisma.deploymentEvent.findFirst({
    where: {
      deployment_id: deploymentId,
      source: "codedeploy",
      event_name: event.event_name,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.deploymentEvent.update({
      where: { id: existing.id },
      data: {
        status: event.status,
        message: event.message,
        log_url: event.log_url,
        started_at: event.started_at ? new Date(event.started_at) : null,
        ended_at: event.ended_at ? new Date(event.ended_at) : null,
        duration_ms: event.duration_ms,
      },
    });
  }

  return prisma.deploymentEvent.create({
    data: {
      deployment_id: deploymentId,
      source: "codedeploy",
      event_name: event.event_name,
      status: event.status,
      message: event.message,
      log_url: event.log_url,
      started_at: event.started_at ? new Date(event.started_at) : null,
      ended_at: event.ended_at ? new Date(event.ended_at) : null,
      duration_ms: event.duration_ms,
    },
  });
}

export async function syncCodeDeployDeploymentFromInfo(
  userId: string,
  deploymentInfo: any,
  fallbackAppName?: string,
  fallbackGroupName?: string,
) {
  const appName = deploymentInfo.applicationName ?? fallbackAppName;
  const groupName = deploymentInfo.deploymentGroupName ?? fallbackGroupName;

  if (!appName || !groupName || !deploymentInfo.deploymentId) {
    return null;
  }

  const mappedEnvironment = await getMappedEnvironment(userId, appName, groupName);
  if (!mappedEnvironment) {
    return null;
  }

  const normalized = normalizeDeployment(deploymentInfo, appName, groupName);
  const codedeployStatus = normalized.status;

  let existingByCodeDeploy = await prisma.deployment.findUnique({
    where: { codedeploy_id: normalized.codedeploy_id },
    select: {
      id: true,
      github_status: true,
      codedeploy_status: true,
      is_rollback: true,
      unified_status: true,
    },
  });

  if (!existingByCodeDeploy && normalized.commit_sha) {
    const existingBySha = await prisma.deployment.findFirst({
      where: {
        user_id: userId,
        commit_sha: normalized.commit_sha,
      },
      select: {
        id: true,
        github_status: true,
        codedeploy_status: true,
        is_rollback: true,
        unified_status: true,
        codedeploy_id: true,
      },
    });

    if (existingBySha && !existingBySha.codedeploy_id) {
      const updated = await prisma.deployment.update({
        where: { id: existingBySha.id },
        data: {
          codedeploy_id: normalized.codedeploy_id,
          codedeploy_status: codedeployStatus,
          finished_at: isTerminalCodeDeployStatus(codedeployStatus) ? new Date() : null,
          duration_seconds: normalized.duration_seconds,
          started_at: normalized.create_time ? new Date(normalized.create_time) : null,
          unified_status: calculateUnifiedStatus(
            existingBySha.github_status ?? null,
            codedeployStatus,
            existingBySha.is_rollback,
          ),
        },
        select: {
          id: true,
          unified_status: true,
        },
      });

      return {
        deployment: updated,
        previousUnifiedStatus: existingBySha.unified_status,
      };
    }
  }

  const previousUnifiedStatus = existingByCodeDeploy?.unified_status ?? null;
  const githubStatusForUnified = existingByCodeDeploy?.github_status ?? null;
  const isRollback = existingByCodeDeploy?.is_rollback ?? false;

  const deployment = await prisma.deployment.upsert({
    where: { codedeploy_id: normalized.codedeploy_id },
    update: {
      codedeploy_status: codedeployStatus,
      started_at: normalized.create_time ? new Date(normalized.create_time) : null,
      finished_at: isTerminalCodeDeployStatus(codedeployStatus)
        ? (normalized.complete_time ? new Date(normalized.complete_time) : new Date())
        : null,
      duration_seconds: normalized.duration_seconds,
      unified_status: calculateUnifiedStatus(githubStatusForUnified, codedeployStatus, isRollback),
      repository_id: mappedEnvironment.repository_id,
      environment_id: mappedEnvironment.id,
      user_id: userId,
      commit_sha: normalized.commit_sha ?? "unknown",
      branch: "unknown",
    },
    create: {
      user_id: userId,
      repository_id: mappedEnvironment.repository_id,
      environment_id: mappedEnvironment.id,
      commit_sha: normalized.commit_sha ?? "unknown",
      branch: "unknown",
      commit_message: null,
      triggered_by: null,
      github_run_id: null,
      github_status: null,
      github_run_url: null,
      codedeploy_id: normalized.codedeploy_id,
      codedeploy_status: codedeployStatus,
      unified_status: calculateUnifiedStatus(null, codedeployStatus, false),
      is_rollback: false,
      started_at: normalized.create_time ? new Date(normalized.create_time) : null,
      finished_at: isTerminalCodeDeployStatus(codedeployStatus)
        ? (normalized.complete_time ? new Date(normalized.complete_time) : new Date())
        : null,
      duration_seconds: normalized.duration_seconds,
    },
    select: {
      id: true,
      unified_status: true,
    },
  });

  return {
    deployment,
    previousUnifiedStatus,
  };
}

export async function listAndSyncDeployments(userId: string, appName: string, groupName: string, limit: number) {
  const client = await getCodeDeployClient(userId);

  const listResponse = await client.send(
    new ListDeploymentsCommand({
      applicationName: appName,
      deploymentGroupName: groupName,
      includeOnlyStatuses: ["Created", "Queued", "InProgress", "Baking", "Ready", "Succeeded", "Failed", "Stopped"],
    }),
  );

  const deploymentIds = (listResponse.deployments ?? []).slice(0, limit);
  if (deploymentIds.length === 0) {
    return [] as NormalizedCodeDeployDeployment[];
  }

  const normalizedDeployments: NormalizedCodeDeployDeployment[] = [];

  for (const deploymentId of deploymentIds) {
    const detail = await client.send(new GetDeploymentCommand({ deploymentId }));
    const info = detail.deploymentInfo;
    if (!info) continue;

    normalizedDeployments.push(normalizeDeployment(info, appName, groupName));
    await syncCodeDeployDeploymentFromInfo(userId, info, appName, groupName);
  }

  return normalizedDeployments;
}

function normalizeLifecycleEvent(event: any): NormalizedDeploymentEvent {
  const startedAt = event.startTime ? new Date(event.startTime) : null;
  const endedAt = event.endTime ? new Date(event.endTime) : null;

  return {
    event_name: event.lifecycleEventName ?? "Unknown",
    status: event.status ?? "Unknown",
    message: event.diagnostics?.message ?? null,
    log_url: event.diagnostics?.logTail ?? null,
    started_at: startedAt ? startedAt.toISOString() : null,
    ended_at: endedAt ? endedAt.toISOString() : null,
    duration_ms: startedAt && endedAt ? Math.max(0, endedAt.getTime() - startedAt.getTime()) : null,
  };
}

export async function getAndStoreDeploymentEvents(userId: string, codedeployId: string) {
  const client = await getCodeDeployClient(userId);

  const deploymentRecord = await prisma.deployment.findFirst({
    where: {
      user_id: userId,
      codedeploy_id: codedeployId,
    },
    select: {
      id: true,
    },
  });

  if (!deploymentRecord) {
    return [] as NormalizedDeploymentEvent[];
  }

  await client.send(new GetDeploymentCommand({ deploymentId: codedeployId }));
  const instances = await client.send(new ListDeploymentInstancesCommand({ deploymentId: codedeployId }));
  const instanceIds = (instances.instancesList ?? []).slice(0, 5);

  const dedupe = new Set<string>();
  const allEvents: NormalizedDeploymentEvent[] = [];

  for (const instanceId of instanceIds) {
    const detail = await client.send(new GetDeploymentInstanceCommand({ deploymentId: codedeployId, instanceId }));
    const lifecycleEvents = detail.instanceSummary?.lifecycleEvents ?? [];

    for (const event of lifecycleEvents) {
      const normalized = normalizeLifecycleEvent(event);
      const key = `${instanceId}:${normalized.event_name}`;
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      allEvents.push(normalized);
      await upsertDeploymentEvent(deploymentRecord.id, normalized);
    }
  }

  return allEvents;
}
