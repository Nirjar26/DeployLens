import { UnifiedStatus } from "@prisma/client";

export function calculateUnifiedStatus(
  githubStatus: string | null,
  codedeployStatus: string | null,
  isRollback: boolean,
): UnifiedStatus {
  if (isRollback) return UnifiedStatus.rolled_back;
  if (!githubStatus && !codedeployStatus) return UnifiedStatus.pending;
  if (githubStatus === "failure" || githubStatus === "cancelled") return UnifiedStatus.failed;
  if (codedeployStatus === "Failed" || codedeployStatus === "Stopped") return UnifiedStatus.failed;
  if (codedeployStatus === "Succeeded" && githubStatus === "success") return UnifiedStatus.success;
  if (githubStatus === "in_progress" || githubStatus === "queued") return UnifiedStatus.running;
  if (codedeployStatus === "InProgress" || codedeployStatus === "Created") return UnifiedStatus.running;
  return UnifiedStatus.pending;
}
