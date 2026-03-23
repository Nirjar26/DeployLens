import { Deployment, UnifiedStatus } from "@prisma/client";

export type AggregatorRunResult = {
  mergedCount: number;
  orphanedCount: number;
  staleCorrectedCount: number;
  durationMs: number;
};

export type AggregatorStatus = {
  total: number;
  byStatus: Record<UnifiedStatus, number>;
  githubOnly: number;
  codedeployOnly: number;
  fullyJoined: number;
  lastAggregatorRun: string | null;
};

export type MergeCandidate = Deployment;
