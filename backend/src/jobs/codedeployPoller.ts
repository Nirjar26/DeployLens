import cron from "node-cron";
import {
  GetDeploymentCommand,
  ListDeploymentsCommand,
} from "@aws-sdk/client-codedeploy";
import { getCodeDeployClient } from "../utils/awsClient";
import { emitDeploymentUpdate } from "../utils/emitDeploymentUpdate";
import { syncCodeDeployDeploymentFromInfo } from "../modules/aws/aws.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const callCount = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canCallAws(userId: string): boolean {
  return (callCount.get(userId) ?? 0) < 50;
}

function markAwsCall(userId: string): void {
  callCount.set(userId, (callCount.get(userId) ?? 0) + 1);
}

async function pollUser(userId: string): Promise<void> {
  const environments = await prisma.environment.findMany({
    where: { user_id: userId },
    select: {
      codedeploy_app: true,
      codedeploy_group: true,
    },
  });

  if (environments.length === 0) {
    return;
  }

  const client = await getCodeDeployClient(userId);

  for (const environment of environments) {
    if (!canCallAws(userId)) {
      break;
    }

    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - 24 * 60 * 60 * 1000);

    const listResult = await client.send(
      new ListDeploymentsCommand({
        applicationName: environment.codedeploy_app,
        deploymentGroupName: environment.codedeploy_group,
        createTimeRange: {
          start: rangeStart,
          end: rangeEnd,
        },
        includeOnlyStatuses: ["Created", "Queued", "InProgress", "Baking", "Ready", "Succeeded", "Failed", "Stopped"],
      }),
    );
    markAwsCall(userId);

    for (const deploymentId of listResult.deployments ?? []) {
      if (!canCallAws(userId)) {
        break;
      }

      const detail = await client.send(new GetDeploymentCommand({ deploymentId }));
      markAwsCall(userId);

      if (!detail.deploymentInfo) {
        continue;
      }

      const synced = await syncCodeDeployDeploymentFromInfo(
        userId,
        detail.deploymentInfo,
        environment.codedeploy_app,
        environment.codedeploy_group,
      );

      if (!synced) {
        continue;
      }

      if (synced.previousUnifiedStatus !== synced.deployment.unified_status) {
        void emitDeploymentUpdate(synced.deployment.id, false).catch((err) => {
          console.error("Failed to emit deployment socket update after CodeDeploy poll:", err);
        });
      }
    }
  }
}

export function startCodeDeployPoller(): void {
  if (process.env.NODE_ENV === "test") {
    console.log("CodeDeploy poller disabled in test environment");
    return;
  }

  cron.schedule("*/60 * * * * *", async () => {
    callCount.clear();

    try {
      const connections = await prisma.awsConnection.findMany({
        select: {
          user_id: true,
        },
      });

      for (const connection of connections) {
        try {
          await pollUser(connection.user_id);
        } catch (error) {
          console.error(`CodeDeploy poll failed for user ${connection.user_id}`, error);
        }

        await sleep(2000);
      }
    } catch (error) {
      console.error("CodeDeploy poller cycle failed", error);
    }
  });
}
