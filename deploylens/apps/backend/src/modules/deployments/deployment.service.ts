import { UnifiedStatus } from "@prisma/client";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type DeploymentFilters = {
  repo?: string;
  environment?: string;
  status?: string;
  branch?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

function shortSha(sha: string | null): string {
  if (!sha) return "";
  return sha.slice(0, 7);
}

function mapDeploymentRow(deployment: any) {
  return {
    id: deployment.id,
    github_run_id: deployment.github_run_id,
    codedeploy_id: deployment.codedeploy_id,
    commit_sha: deployment.commit_sha,
    commit_sha_short: shortSha(deployment.commit_sha),
    commit_message: deployment.commit_message,
    branch: deployment.branch,
    triggered_by: deployment.triggered_by,
    github_status: deployment.github_status,
    github_run_url: deployment.github_run_url,
    codedeploy_status: deployment.codedeploy_status,
    unified_status: deployment.unified_status,
    is_rollback: deployment.is_rollback,
    started_at: deployment.started_at?.toISOString() ?? null,
    finished_at: deployment.finished_at?.toISOString() ?? null,
    duration_seconds: deployment.duration_seconds,
    created_at: deployment.created_at.toISOString(),
    repository: {
      id: deployment.repository.id,
      full_name: deployment.repository.full_name,
      owner: deployment.repository.owner,
      name: deployment.repository.name,
    },
    environment: deployment.environment
      ? {
        id: deployment.environment.id,
        display_name: deployment.environment.display_name,
        color_tag: deployment.environment.color_tag,
      }
      : null,
  };
}

function buildWhere(userId: string, filters: DeploymentFilters) {
  const where: any = {
    user_id: userId,
  };

  if (filters.repo) {
    where.repository = {
      full_name: filters.repo,
    };
  }

  if (filters.environment) {
    where.environment = {
      display_name: filters.environment,
    };
  }

  if (filters.status) {
    where.unified_status = filters.status;
  }

  if (filters.branch) {
    where.branch = {
      contains: filters.branch,
      mode: "insensitive",
    };
  }

  if (filters.from || filters.to) {
    where.created_at = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  return where;
}

export async function listDeployments(userId: string, filters: DeploymentFilters) {
  const where = buildWhere(userId, filters);

  const [total, rows] = await Promise.all([
    prisma.deployment.count({ where }),
    prisma.deployment.findMany({
      where,
      include: {
        repository: {
          select: {
            id: true,
            full_name: true,
            owner: true,
            name: true,
          },
        },
        environment: {
          select: {
            id: true,
            display_name: true,
            color_tag: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return {
    deployments: rows.map(mapDeploymentRow),
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
      hasNext: filters.page < totalPages,
      hasPrev: filters.page > 1,
    },
  };
}

function isRollbackEligibleStatus(status: UnifiedStatus): boolean {
  return status === "success" || status === "failed";
}

export async function getDeploymentById(userId: string, deploymentId: string) {
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      user_id: userId,
    },
    include: {
      repository: {
        select: {
          id: true,
          full_name: true,
          owner: true,
          name: true,
        },
      },
      environment: {
        select: {
          id: true,
          display_name: true,
          color_tag: true,
        },
      },
      rolled_back_from: {
        select: {
          id: true,
          commit_sha: true,
          started_at: true,
        },
      },
    },
  });

  if (!deployment) {
    throw new Error("DEPLOYMENT_NOT_FOUND");
  }

  const events = await prisma.deploymentEvent.findMany({
    where: { deployment_id: deployment.id },
    orderBy: [{ started_at: "asc" }, { event_name: "asc" }],
  });

  let canRollback = false;
  if (
    deployment.environment_id &&
    !deployment.is_rollback &&
    Boolean(deployment.codedeploy_id) &&
    isRollbackEligibleStatus(deployment.unified_status)
  ) {
    const previousSuccess = await prisma.deployment.findFirst({
      where: {
        user_id: userId,
        environment_id: deployment.environment_id,
        unified_status: "success",
        created_at: { lt: deployment.created_at },
        is_rollback: false,
      },
      orderBy: { created_at: "desc" },
      select: { id: true },
    });

    canRollback = Boolean(previousSuccess);
  }

  return {
    ...mapDeploymentRow(deployment),
    events: events.map((event: any) => ({
      id: event.id,
      source: event.source,
      event_name: event.event_name,
      status: event.status,
      message: event.message,
      log_url: event.log_url,
      started_at: event.started_at?.toISOString() ?? null,
      ended_at: event.ended_at?.toISOString() ?? null,
      duration_ms: event.duration_ms,
    })),
    rollback_info: deployment.is_rollback && deployment.rolled_back_from
      ? {
        rolled_back_from: {
          id: deployment.rolled_back_from.id,
          commit_sha_short: shortSha(deployment.rolled_back_from.commit_sha),
          started_at: deployment.rolled_back_from.started_at?.toISOString() ?? "",
        },
      }
      : null,
    can_rollback: canRollback,
  };
}

export async function getEnvironmentLatest(userId: string) {
  const environments = await prisma.environment.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      display_name: true,
      color_tag: true,
    },
    orderBy: { display_name: "asc" },
  });

  if (environments.length === 0) {
    return { environments: [] };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const results = await Promise.all(
    environments.map(async (env: any) => {
      const [latest, totalToday, sevenDayRows] = await Promise.all([
      prisma.deployment.findFirst({
        where: {
          user_id: userId,
          environment_id: env.id,
        },
        include: {
          repository: { select: { id: true, full_name: true, owner: true, name: true } },
          environment: { select: { id: true, display_name: true, color_tag: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.deployment.count({
        where: {
          user_id: userId,
          environment_id: env.id,
          created_at: { gte: todayStart },
        },
      }),
      prisma.deployment.findMany({
        where: {
          user_id: userId,
          environment_id: env.id,
          created_at: { gte: sevenDaysAgo },
        },
        select: {
          unified_status: true,
        },
      }),
    ]);

      const successCount = sevenDayRows.filter((row: any) => row.unified_status === "success").length;
    const successRate = sevenDayRows.length === 0 ? 0 : Math.round((successCount / sevenDayRows.length) * 100);

      return {
        environment: {
          id: env.id,
          display_name: env.display_name,
          color_tag: env.color_tag,
        },
        latest_deployment: latest ? mapDeploymentRow(latest) : null,
        total_today: totalToday,
        success_rate: successRate,
      };
    });
  );

  return { environments: results };
}

export async function getDeploymentStats(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalToday,
    successToday,
    failedToday,
    runningNow,
    sevenDayRows,
  ] = await Promise.all([
    prisma.deployment.count({
      where: {
        user_id: userId,
        created_at: { gte: todayStart },
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        created_at: { gte: todayStart },
        unified_status: "success",
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        created_at: { gte: todayStart },
        unified_status: "failed",
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        unified_status: "running",
      },
    }),
    prisma.deployment.findMany({
      where: {
        user_id: userId,
        finished_at: { gte: sevenDaysAgo },
        duration_seconds: { not: null },
      },
      select: {
        unified_status: true,
        duration_seconds: true,
      },
    }),
  ]);

  const success7d = sevenDayRows.filter((row: any) => row.unified_status === "success").length;
  const successRate7d = sevenDayRows.length === 0 ? 0 : Math.round((success7d / sevenDayRows.length) * 100);

  const durations = sevenDayRows
    .map((row: any) => row.duration_seconds)
    .filter((value: number | null) => typeof value === "number" && value >= 0);

  const avgDuration7d = durations.length === 0
    ? 0
    : Math.round(durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length);

  return {
    total_today: totalToday,
    success_today: successToday,
    failed_today: failedToday,
    running_now: runningNow,
    success_rate_7d: successRate7d,
    avg_duration_7d: avgDuration7d,
  };
}
