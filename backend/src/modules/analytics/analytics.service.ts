const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type Range = "7d" | "30d" | "90d";
type GroupBy = "day" | "week";

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return start;
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getRangeStart(range: Range): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return addUtcDays(startOfUtcDay(now), -(days - 1));
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx] ?? 0;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function getRowsForRange(userId: string, range: Range) {
  const startDate = getRangeStart(range);
  return prisma.deployment.findMany({
    where: {
      user_id: userId,
      created_at: { gte: startDate },
    },
    select: {
      id: true,
      commit_sha: true,
      branch: true,
      unified_status: true,
      github_status: true,
      is_rollback: true,
      duration_seconds: true,
      started_at: true,
      created_at: true,
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
    orderBy: { created_at: "asc" },
  });
}

export async function getOverview(userId: string, range: Range) {
  const rows = await getRowsForRange(userId, range);
  const totalDeployments = rows.length;
  const successCount = rows.filter((row: any) => row.unified_status === "success").length;
  const failedCount = rows.filter((row: any) => row.unified_status === "failed").length;
  const rollbackCount = rows.filter((row: any) => row.is_rollback || row.unified_status === "rolled_back").length;

  const durations = rows
    .map((row: any) => row.duration_seconds)
    .filter((value: number | null) => typeof value === "number" && value >= 0);

  const repoCounts = new Map<string, number>();
  const failedRepoCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  for (const row of rows) {
    const repoName = row.repository.full_name;
    repoCounts.set(repoName, (repoCounts.get(repoName) ?? 0) + 1);

    if (row.unified_status === "failed") {
      failedRepoCounts.set(repoName, (failedRepoCounts.get(repoName) ?? 0) + 1);
    }

    const day = toIsoDay(row.created_at);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const mostActiveRepoEntry = [...repoCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const mostFailedRepoEntry = [...failedRepoCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const busiestDayEntry = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    total_deployments: totalDeployments,
    success_count: successCount,
    failed_count: failedCount,
    rollback_count: rollbackCount,
    success_rate: totalDeployments === 0 ? 0 : Number(((successCount / totalDeployments) * 100).toFixed(2)),
    avg_duration_seconds: Math.round(avg(durations)),
    p95_duration_seconds: Math.round(percentile95(durations)),
    most_active_repo: mostActiveRepoEntry
      ? { full_name: mostActiveRepoEntry[0], count: mostActiveRepoEntry[1] }
      : { full_name: "", count: 0 },
    most_failed_repo: mostFailedRepoEntry
      ? { full_name: mostFailedRepoEntry[0], count: mostFailedRepoEntry[1] }
      : { full_name: "", count: 0 },
    busiest_day: busiestDayEntry
      ? { date: busiestDayEntry[0], count: busiestDayEntry[1] }
      : { date: "", count: 0 },
  };
}

export async function getFrequency(userId: string, range: Range, groupBy: GroupBy) {
  const rows = await getRowsForRange(userId, range);
  const startDate = getRangeStart(range);
  const now = startOfUtcDay(new Date());

  const buckets = new Map<string, { date: string; total: number; success: number; failed: number }>();

  if (groupBy === "day") {
    for (let d = startDate; d <= now; d = addUtcDays(d, 1)) {
      const key = toIsoDay(d);
      buckets.set(key, { date: key, total: 0, success: 0, failed: 0 });
    }

    for (const row of rows) {
      const key = toIsoDay(row.created_at);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (row.unified_status === "success") bucket.success += 1;
      if (row.unified_status === "failed") bucket.failed += 1;
    }
  } else {
    const weekStart = startOfUtcWeek(startDate);
    const weekNow = startOfUtcWeek(now);

    for (let d = weekStart; d <= weekNow; d = addUtcDays(d, 7)) {
      const key = toIsoDay(d);
      buckets.set(key, { date: key, total: 0, success: 0, failed: 0 });
    }

    for (const row of rows) {
      const key = toIsoDay(startOfUtcWeek(row.created_at));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (row.unified_status === "success") bucket.success += 1;
      if (row.unified_status === "failed") bucket.failed += 1;
    }
  }

  return [...buckets.values()];
}

export async function getDurationTrend(userId: string, range: Range, repo?: string) {
  const startDate = getRangeStart(range);
  const rows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      created_at: { gte: startDate },
      finished_at: { not: null },
      duration_seconds: { not: null },
      ...(repo ? { repository: { full_name: repo } } : {}),
    },
    select: {
      created_at: true,
      duration_seconds: true,
    },
    orderBy: { created_at: "asc" },
  });

  const byDay = new Map<string, number[]>();

  for (const row of rows) {
    const key = toIsoDay(row.created_at);
    const list = byDay.get(key) ?? [];
    list.push(row.duration_seconds as number);
    byDay.set(key, list);
  }

  return [...byDay.entries()].map(([date, durations]) => ({
    date,
    avg_seconds: Math.round(avg(durations)),
    p95_seconds: Math.round(percentile95(durations)),
  }));
}

export async function getByRepo(userId: string, range: Range) {
  const rows = await getRowsForRange(userId, range);
  const byRepo = new Map<string, {
    repo_full_name: string;
    total: number;
    success: number;
    failed: number;
    durations: number[];
    last_deployment_at: string;
  }>();

  for (const row of rows) {
    const key = row.repository.full_name;
    const current = byRepo.get(key) ?? {
      repo_full_name: key,
      total: 0,
      success: 0,
      failed: 0,
      durations: [] as number[],
      last_deployment_at: row.created_at.toISOString(),
    };

    current.total += 1;
    if (row.unified_status === "success") current.success += 1;
    if (row.unified_status === "failed") current.failed += 1;
    if (typeof row.duration_seconds === "number") current.durations.push(row.duration_seconds);
    if (new Date(row.created_at).getTime() > new Date(current.last_deployment_at).getTime()) {
      current.last_deployment_at = row.created_at.toISOString();
    }

    byRepo.set(key, current);
  }

  return [...byRepo.values()]
    .map((item) => ({
      repo_full_name: item.repo_full_name,
      total: item.total,
      success: item.success,
      failed: item.failed,
      success_rate: item.total === 0 ? 0 : Number(((item.success / item.total) * 100).toFixed(2)),
      avg_duration_seconds: Math.round(avg(item.durations)),
      last_deployment_at: item.last_deployment_at,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function getByEnvironment(userId: string, range: Range) {
  const rows = await getRowsForRange(userId, range);
  const byEnv = new Map<string, {
    environment_display_name: string;
    color_tag: string;
    total: number;
    success: number;
    failed: number;
    durations: number[];
  }>();

  for (const row of rows) {
    const displayName = row.environment?.display_name ?? "Unassigned";
    const key = row.environment?.id ?? "unassigned";
    const current = byEnv.get(key) ?? {
      environment_display_name: displayName,
      color_tag: row.environment?.color_tag ?? "#94a3b8",
      total: 0,
      success: 0,
      failed: 0,
      durations: [] as number[],
    };

    current.total += 1;
    if (row.unified_status === "success") current.success += 1;
    if (row.unified_status === "failed") current.failed += 1;
    if (typeof row.duration_seconds === "number") current.durations.push(row.duration_seconds);

    byEnv.set(key, current);
  }

  return [...byEnv.values()].map((item) => ({
    environment_display_name: item.environment_display_name,
    color_tag: item.color_tag,
    total: item.total,
    success: item.success,
    failed: item.failed,
    success_rate: item.total === 0 ? 0 : Number(((item.success / item.total) * 100).toFixed(2)),
    avg_duration_seconds: Math.round(avg(item.durations)),
  }));
}

export async function getMttr(userId: string, range: Range) {
  const startDate = getRangeStart(range);

  const rows = await prisma.deployment.findMany({
    where: {
      user_id: userId,
      created_at: { gte: startDate },
      started_at: { not: null },
      OR: [
        { unified_status: "failed" },
        { unified_status: "success" },
      ],
    },
    select: {
      environment_id: true,
      started_at: true,
      unified_status: true,
      environment: {
        select: {
          display_name: true,
        },
      },
    },
    orderBy: { started_at: "asc" },
  });

  const byEnvRows = new Map<string, Array<{ started_at: Date; unified_status: string; display_name: string }>>();

  for (const row of rows) {
    if (!row.environment_id || !row.started_at) continue;
    const list = byEnvRows.get(row.environment_id) ?? [];
    list.push({
      started_at: row.started_at,
      unified_status: row.unified_status,
      display_name: row.environment?.display_name ?? "Unknown",
    });
    byEnvRows.set(row.environment_id, list);
  }

  const byEnvironment: Array<{ display_name: string; avg_mttr_minutes: number }> = [];
  const allDiffs: number[] = [];

  for (const [, envRows] of byEnvRows.entries()) {
    const envDiffs: number[] = [];

    for (let i = 0; i < envRows.length; i += 1) {
      const current = envRows[i];
      if (current.unified_status !== "failed") continue;

      const nextSuccess = envRows.slice(i + 1).find((item) => item.unified_status === "success");
      if (!nextSuccess) continue;

      const diffMs = nextSuccess.started_at.getTime() - current.started_at.getTime();
      if (diffMs >= 0) {
        envDiffs.push(diffMs / 60000);
        allDiffs.push(diffMs / 60000);
      }
    }

    byEnvironment.push({
      display_name: envRows[0]?.display_name ?? "Unknown",
      avg_mttr_minutes: envDiffs.length === 0 ? 0 : Number(avg(envDiffs).toFixed(2)),
    });
  }

  return {
    avg_mttr_minutes: allDiffs.length === 0 ? 0 : Number(avg(allDiffs).toFixed(2)),
    by_environment: byEnvironment,
  };
}

export function parseRange(input: string | undefined): Range {
  if (input === "7d" || input === "30d" || input === "90d") return input;
  return "30d";
}

export function parseGroupBy(input: string | undefined): GroupBy {
  if (input === "week") return "week";
  return "day";
}
