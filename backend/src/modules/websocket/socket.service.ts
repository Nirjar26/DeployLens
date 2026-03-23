import { PrismaClient } from "@prisma/client";
import { getIO } from "./socket.server";
import { DeploymentCreatedEvent, DeploymentUpdatedEvent } from "./socket.types";

const prisma = new PrismaClient();

const TERMINAL_STATUSES = ["success", "failed", "rolled_back"] as const;

export async function emitDeploymentUpdated(deploymentId: string): Promise<void> {
  try {
    const io = getIO();

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
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
    });

    if (!deployment) {
      return;
    }

    const payload: DeploymentUpdatedEvent = {
      type: "deployment:updated",
      deploymentId: deployment.id,
      unified_status: deployment.unified_status,
      github_status: deployment.github_status,
      codedeploy_status: deployment.codedeploy_status,
      finished_at: deployment.finished_at?.toISOString() ?? null,
      duration_seconds: deployment.duration_seconds,
      started_at: deployment.started_at?.toISOString() ?? null,
      repository: deployment.repository,
      environment: deployment.environment,
    };

    io.to(`user:${deployment.user_id}`).to(`deployment:${deploymentId}`).emit("deployment:updated", payload);

    if (TERMINAL_STATUSES.includes(deployment.unified_status as (typeof TERMINAL_STATUSES)[number])) {
      await emitStatsUpdated(deployment.user_id);
    }
  } catch (err) {
    console.error("Socket emit failed for deployment:", deploymentId, err);
  }
}

export async function emitDeploymentCreated(deploymentId: string): Promise<void> {
  try {
    const io = getIO();

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
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
    });

    if (!deployment) {
      return;
    }

    const payload: DeploymentCreatedEvent = {
      type: "deployment:created",
      deploymentId: deployment.id,
      unified_status: deployment.unified_status,
      commit_sha: deployment.commit_sha,
      commit_sha_short: deployment.commit_sha?.slice(0, 7) ?? null,
      commit_message: deployment.commit_message,
      branch: deployment.branch,
      triggered_by: deployment.triggered_by,
      created_at: deployment.created_at.toISOString(),
      repository: deployment.repository,
      environment: deployment.environment,
    };

    io.to(`user:${deployment.user_id}`).emit("deployment:created", payload);
  } catch (err) {
    console.error("Socket emit failed for new deployment:", deploymentId, err);
  }
}

export async function emitStatsUpdated(userId: string): Promise<void> {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("stats:refresh", {
      type: "stats:refresh",
      userId,
    });
  } catch (err) {
    console.error("Socket emit failed for stats refresh:", userId, err);
  }
}
