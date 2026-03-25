import { UnifiedStatus } from "@prisma/client";
import { CreateDeploymentCommand, GetDeploymentCommand } from "@aws-sdk/client-codedeploy";
import { getCodeDeployClient } from "../../utils/awsClient";
import { writeAuditLog } from "../../utils/auditLog";
import { createGithubClient } from "../../utils/githubClient";
import { getGithubAccessTokenForUser } from "../github/github.service";

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
  sort_by?: string;
  sort_dir?: string;
  triggered_by?: string;
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
    is_first_deploy: Boolean(deployment.is_first_deploy),
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

  if (filters.triggered_by) {
    where.triggered_by = filters.triggered_by;
  }

  return where;
}

export async function listDeployments(userId: string, filters: DeploymentFilters) {
  const where = buildWhere(userId, filters);

  // Validate and set sort field
  const validSortFields = ["created_at", "duration_seconds", "unified_status"];
  const sortField = validSortFields.includes(filters.sort_by || "")
    ? filters.sort_by
    : "created_at";

  const sortDirection = filters.sort_dir === "asc" ? "asc" : "desc";

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
      orderBy: { [sortField]: sortDirection },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ]);

  const uniqueRepoEnv = Array.from(new Set(
    rows
      .filter((row: any) => row.environment_id)
      .map((row: any) => `${row.repository_id}::${row.environment_id}`),
  ));

  const firstDeployByCombo = new Map<string, string>();
  await Promise.all(
    uniqueRepoEnv.map(async (combo) => {
      const [repository_id, environment_id] = combo.split("::");
      const first = await prisma.deployment.findFirst({
        where: {
          user_id: userId,
          repository_id,
          environment_id,
        },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true },
      });

      if (first?.id) {
        firstDeployByCombo.set(combo, first.id);
      }
    }),
  );

  const rowsWithFirstFlag = rows.map((row: any) => {
    if (!row.environment_id) {
      return { ...row, is_first_deploy: false };
    }

    const combo = `${row.repository_id}::${row.environment_id}`;
    return {
      ...row,
      is_first_deploy: firstDeployByCombo.get(combo) === row.id,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return {
    deployments: rowsWithFirstFlag.map(mapDeploymentRow),
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

  const results = await Promise.all(
    environments.map(async (env: any) => {
      const [latest, totalToday, recentStatusesRows, recentDeployments] = await Promise.all([
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
          },
          select: {
            unified_status: true,
          },
          orderBy: { created_at: "desc" },
          take: 10,
        }),
        prisma.deployment.findMany({
          where: {
            user_id: userId,
            environment_id: env.id,
          },
          include: {
            repository: { select: { id: true, full_name: true, owner: true, name: true } },
            environment: { select: { id: true, display_name: true, color_tag: true } },
          },
          orderBy: { created_at: "desc" },
          take: 5,
        }),
      ]);

      const successCount = recentStatusesRows.filter((row: any) => row.unified_status === "success").length;
      const successRate = recentStatusesRows.length === 0 ? 0 : Math.round((successCount / recentStatusesRows.length) * 100);

      return {
        environment: {
          id: env.id,
          display_name: env.display_name,
          color_tag: env.color_tag,
        },
        latest_deployment: latest ? mapDeploymentRow(latest) : null,
        recent_deployments: recentDeployments.map(mapDeploymentRow),
        recent_statuses: recentStatusesRows.map((row: any) => row.unified_status),
        total_today: totalToday,
        success_rate: successRate,
      };
    }),
  );

  return { environments: results };
}

export async function getDeploymentStats(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalToday,
    successToday,
    failedToday,
    runningNow,
    sevenDayRows,
    statusCounts,
    previousSevenDayRows,
    thirtyDayTotal,
    rollbackCount7d,
    topDeployersRaw,
    e2eRows,
    recentDaily,
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
    prisma.deployment.groupBy({
      by: ["unified_status"],
      where: { user_id: userId },
      _count: { id: true },
    }),
    prisma.deployment.findMany({
      where: {
        user_id: userId,
        finished_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        duration_seconds: { not: null },
      },
      select: {
        unified_status: true,
        duration_seconds: true,
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
    }),
    prisma.deployment.count({
      where: {
        user_id: userId,
        unified_status: "rolled_back",
        created_at: { gte: sevenDaysAgo },
      },
    }),
    prisma.deployment.groupBy({
      by: ["triggered_by"],
      where: {
        user_id: userId,
        created_at: { gte: sevenDaysAgo },
        triggered_by: { not: null },
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    }),
    prisma.deployment.findMany({
      where: {
        user_id: userId,
        github_status: "success",
        codedeploy_status: "Succeeded",
        started_at: { not: null },
        finished_at: { not: null, gte: sevenDaysAgo },
      },
      select: {
        started_at: true,
        finished_at: true,
      },
    }),
    prisma.deployment.groupBy({
      by: ["created_at"],
      where: {
        user_id: userId,
        created_at: { gte: sevenDaysAgo },
      },
      _count: { id: true },
      orderBy: { created_at: "asc" },
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

  const prevSuccess7d = previousSevenDayRows.filter((row: any) => row.unified_status === "success").length;
  const successRatePrev7d = previousSevenDayRows.length === 0
    ? 0
    : Math.round((prevSuccess7d / previousSevenDayRows.length) * 100);

  const prevDurations = previousSevenDayRows
    .map((row: any) => row.duration_seconds)
    .filter((value: number | null) => typeof value === "number" && value >= 0);

  const avgDurationPrev7d = prevDurations.length === 0
    ? 0
    : Math.round(prevDurations.reduce((sum: number, value: number) => sum + value, 0) / prevDurations.length);

  const avgE2ESeconds = e2eRows.length === 0
    ? null
    : Math.round(
      e2eRows.reduce((sum: number, row: any) => {
        const started = row.started_at ? new Date(row.started_at).getTime() : 0;
        const finished = row.finished_at ? new Date(row.finished_at).getTime() : 0;
        if (!started || !finished || finished < started) return sum;
        return sum + Math.round((finished - started) / 1000);
      }, 0) / e2eRows.length,
    );

  const thirtyDayDailyAvg = Number((thirtyDayTotal / 30).toFixed(2));

  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }

  recentDaily.forEach((item: any) => {
    const key = new Date(item.created_at).toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + item._count.id);
    }
  });

  const topDeployers = topDeployersRaw
    .filter((row: any) => row.triggered_by)
    .map((row: any) => ({
      triggered_by: String(row.triggered_by),
      count: row._count.id,
    }));

  // Map status counts
  const byStatus = {
    pending: 0,
    running: 0,
    success: 0,
    failed: 0,
    rolled_back: 0,
    total: 0,
  };

  statusCounts.forEach((item: any) => {
    const status = item.unified_status as string;
    const count = item._count.id;
    if (status in byStatus) {
      (byStatus as any)[status] = count;
    }
    byStatus.total += count;
  });

  return {
    total_today: totalToday,
    success_today: successToday,
    failed_today: failedToday,
    running_now: runningNow,
    success_rate_7d: successRate7d,
    success_rate_prev_7d: successRatePrev7d,
    avg_duration_7d: avgDuration7d,
    avg_duration_prev_7d: avgDurationPrev7d,
    avg_e2e_seconds: avgE2ESeconds,
    rollback_count_7d: rollbackCount7d,
    thirty_day_daily_avg: thirtyDayDailyAvg,
    top_deployers: topDeployers,
    last_7_days: Array.from(dayMap.entries()).map(([date, total]) => ({ date, total })),
    by_status: byStatus,
  };
}

export async function getLastGoodDeployment(userId: string) {
  let latest = await prisma.deployment.findFirst({
    where: {
      user_id: userId,
      unified_status: "success",
      OR: [
        { environment: { display_name: { contains: "prod", mode: "insensitive" } } },
        { environment: { color_tag: "#ef4444" } },
      ],
    },
    include: {
      repository: {
        select: {
          name: true,
        },
      },
      environment: {
        select: {
          display_name: true,
        },
      },
    },
    orderBy: [{ finished_at: "desc" }, { created_at: "desc" }],
  });

  if (!latest) {
    latest = await prisma.deployment.findFirst({
      where: {
        user_id: userId,
        unified_status: "success",
      },
      include: {
        repository: {
          select: {
            name: true,
          },
        },
        environment: {
          select: {
            display_name: true,
          },
        },
      },
      orderBy: [{ finished_at: "desc" }, { created_at: "desc" }],
    });
  }

  if (!latest) {
    return null;
  }

  return {
    id: latest.id,
    commit_sha_short: shortSha(latest.commit_sha),
    commit_message: latest.commit_message ?? "",
    triggered_by: latest.triggered_by ?? "unknown",
    finished_at: (latest.finished_at ?? latest.created_at).toISOString(),
    environment_display_name: latest.environment?.display_name ?? "unknown",
    repository_name: latest.repository?.name ?? "unknown",
  };
}

export async function compareDeployments(userId: string, deploymentAId: string, deploymentBId: string) {
  const [a, b] = await Promise.all([
    getDeploymentById(userId, deploymentAId),
    getDeploymentById(userId, deploymentBId),
  ]);

  const durationA = a.duration_seconds ?? 0;
  const durationB = b.duration_seconds ?? 0;
  const durationDelta = durationB - durationA;
  const durationChangePct = durationA === 0 ? 0 : Number((((durationB - durationA) / durationA) * 100).toFixed(2));

  let commitsBetween: number | null = null;
  let commitCompare: {
    ahead_by: number;
    behind_by: number;
    commits: Array<{ sha: string; message: string; author: string }>;
  } | null = null;

  if (a.commit_sha && b.commit_sha && a.repository.full_name === b.repository.full_name) {
    try {
      const token = await getGithubAccessTokenForUser(userId);
      const github = createGithubClient(token, userId);
      const response = await github.get(`/repos/${a.repository.owner}/${a.repository.name}/compare/${a.commit_sha}...${b.commit_sha}`);

      const ahead_by = Number(response.data?.ahead_by ?? 0);
      const behind_by = Number(response.data?.behind_by ?? 0);
      const commits = Array.isArray(response.data?.commits)
        ? response.data.commits.map((commit: any) => ({
          sha: String(commit.sha ?? "").slice(0, 7),
          message: String(commit.commit?.message ?? ""),
          author: String(commit.author?.login ?? commit.commit?.author?.name ?? "unknown"),
        }))
        : [];

      commitsBetween = ahead_by;
      commitCompare = {
        ahead_by,
        behind_by,
        commits,
      };
    } catch {
      commitsBetween = null;
      commitCompare = null;
    }
  }

  return {
    deployment_a: a,
    deployment_b: b,
    diff: {
      duration_delta_seconds: durationDelta,
      duration_change_pct: durationChangePct,
      status_changed: a.unified_status !== b.unified_status,
      branch_changed: a.branch !== b.branch,
      environment_changed: a.environment?.id !== b.environment?.id,
      commits_between: commitsBetween,
      commit_compare: commitCompare,
    },
  };
}

export async function promoteDeployment(
  userId: string,
  sourceDeploymentId: string,
  targetEnvironmentId: string,
  req?: any,
) {
  const source = await prisma.deployment.findFirst({
    where: {
      id: sourceDeploymentId,
      user_id: userId,
    },
    include: {
      environment: {
        select: {
          id: true,
          display_name: true,
        },
      },
      repository: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  });

  if (!source) {
    throw new Error("DEPLOYMENT_NOT_FOUND");
  }

  if (source.unified_status !== "success" || !source.codedeploy_id) {
    throw new Error("NOT_PROMOTABLE");
  }

  const targetEnvironment = await prisma.environment.findFirst({
    where: {
      id: targetEnvironmentId,
      user_id: userId,
    },
    select: {
      id: true,
      repository_id: true,
      codedeploy_app: true,
      codedeploy_group: true,
      display_name: true,
      color_tag: true,
    },
  });

  if (!targetEnvironment) {
    throw new Error("TARGET_ENV_NOT_FOUND");
  }

  if (targetEnvironment.id === source.environment_id) {
    throw new Error("TARGET_ENV_INVALID");
  }

  if (targetEnvironment.repository_id !== source.repository_id) {
    throw new Error("TARGET_ENV_REPO_MISMATCH");
  }

  const client = await getCodeDeployClient(userId);

  const sourceDeploymentResult = await client.send(new GetDeploymentCommand({
    deploymentId: source.codedeploy_id,
  }));

  const sourceRevision = sourceDeploymentResult.deploymentInfo?.revision;
  if (!sourceRevision) {
    throw new Error("SOURCE_REVISION_NOT_FOUND");
  }

  let createdCodeDeployId: string;
  try {
    const createResult = await client.send(new CreateDeploymentCommand({
      applicationName: targetEnvironment.codedeploy_app,
      deploymentGroupName: targetEnvironment.codedeploy_group,
      revision: sourceRevision,
    }));

    if (!createResult.deploymentId) {
      throw new Error("AWS_PROMOTION_FAILED");
    }

    createdCodeDeployId = createResult.deploymentId;
  } catch {
    throw new Error("AWS_PROMOTION_FAILED");
  }

  const created = await prisma.deployment.create({
    data: {
      user_id: userId,
      repository_id: source.repository_id,
      environment_id: targetEnvironment.id,
      commit_sha: source.commit_sha,
      branch: source.branch,
      commit_message: source.commit_message,
      triggered_by: userId,
      github_run_id: null,
      github_status: source.github_status,
      github_run_url: source.github_run_url,
      codedeploy_id: createdCodeDeployId,
      codedeploy_status: "Created",
      unified_status: "running",
      is_rollback: false,
      started_at: new Date(),
      finished_at: null,
      duration_seconds: null,
    },
    select: { id: true },
  });

  await writeAuditLog({
    userId,
    action: "deployment.promoted",
    entityType: "deployment",
    entityId: created.id,
    metadata: {
      source_deployment_id: source.id,
      source_environment: source.environment?.display_name ?? "unknown",
      target_environment: targetEnvironment.display_name,
      commit_sha: source.commit_sha,
    },
    req,
  });

  return {
    sourceDeploymentId: source.id,
    newDeploymentId: created.id,
    targetEnvironmentName: targetEnvironment.display_name,
  };
}
