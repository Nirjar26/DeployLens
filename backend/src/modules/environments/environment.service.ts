import { ListDeploymentGroupsCommand } from "@aws-sdk/client-codedeploy";
import { Request } from "express";
import { getCodeDeployClient } from "../../utils/awsClient";
import { writeAuditLog } from "../../utils/auditLog";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

export async function createOrUpdateEnvironment(userId: string, input: {
  repository_id: string;
  codedeploy_app: string;
  codedeploy_group: string;
  display_name: string;
  color_tag: string;
}, req?: Request) {
  const repository = await prisma.repository.findFirst({
    where: {
      id: input.repository_id,
      user_id: userId,
      is_active: true,
    },
    select: { id: true },
  });

  if (!repository) {
    throw new Error("FORBIDDEN");
  }

  const client = await getCodeDeployClient(userId);

  try {
    const groups = await client.send(
      new ListDeploymentGroupsCommand({
        applicationName: input.codedeploy_app,
      }),
    );

    const validGroups = groups.deploymentGroups ?? [];
    if (!validGroups.includes(input.codedeploy_group)) {
      throw new Error("GROUP_NOT_FOUND");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      throw error;
    }

    throw new Error("AWS_UNREACHABLE");
  }

  const environment = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: userId,
        codedeploy_app: input.codedeploy_app,
        codedeploy_group: input.codedeploy_group,
      },
    },
    update: {
      repository_id: input.repository_id,
      display_name: input.display_name,
      color_tag: input.color_tag,
    },
    create: {
      user_id: userId,
      repository_id: input.repository_id,
      codedeploy_app: input.codedeploy_app,
      codedeploy_group: input.codedeploy_group,
      display_name: input.display_name,
      color_tag: input.color_tag,
    },
  });

  await writeAuditLog({
    userId,
    action: "environment.created",
    entityType: "environment",
    entityId: environment.id,
    metadata: {
      display_name: environment.display_name,
      repository_id: environment.repository_id,
      codedeploy_app: environment.codedeploy_app,
      codedeploy_group: environment.codedeploy_group,
    },
    req,
  });

  return environment;
}

export async function listEnvironments(userId: string) {
  const environments = await prisma.environment.findMany({
    where: { user_id: userId },
    include: {
      repository: {
        select: {
          full_name: true,
        },
      },
    },
    orderBy: { display_name: "asc" },
  });

  return environments.map((env: (typeof environments)[number]) => ({
    id: env.id,
    repository_id: env.repository_id,
    repository_full_name: env.repository.full_name,
    codedeploy_app: env.codedeploy_app,
    codedeploy_group: env.codedeploy_group,
    display_name: env.display_name,
    color_tag: env.color_tag,
    created_at: env.created_at,
  }));
}

export async function updateEnvironment(userId: string, id: string, body: {
  display_name?: string;
  color_tag?: string;
  codedeploy_app?: unknown;
  codedeploy_group?: unknown;
}, req?: Request) {
  if (body.codedeploy_app !== undefined || body.codedeploy_group !== undefined) {
    throw new Error("IMMUTABLE_FIELDS");
  }

  const existing = await prisma.environment.findUnique({
    where: { id },
    select: {
      id: true,
      user_id: true,
    },
  });

  if (!existing || existing.user_id !== userId) {
    throw new Error("FORBIDDEN");
  }

  const updated = await prisma.environment.update({
    where: { id },
    data: {
      ...(body.display_name !== undefined ? { display_name: body.display_name } : {}),
      ...(body.color_tag !== undefined ? { color_tag: body.color_tag } : {}),
    },
  });

  await writeAuditLog({
    userId,
    action: "environment.updated",
    entityType: "environment",
    entityId: updated.id,
    metadata: {
      display_name: updated.display_name,
      color_tag: updated.color_tag,
    },
    req,
  });

  return updated;
}

export async function deleteEnvironment(userId: string, id: string, req?: Request) {
  const existing = await prisma.environment.findUnique({
    where: { id },
    select: {
      id: true,
      user_id: true,
      display_name: true,
      color_tag: true,
    },
  });

  if (!existing || existing.user_id !== userId) {
    throw new Error("FORBIDDEN");
  }

  await prisma.$transaction([
    prisma.deployment.updateMany({
      where: { environment_id: id },
      data: { environment_id: null },
    }),
    prisma.environment.delete({ where: { id } }),
  ]);

  await writeAuditLog({
    userId,
    action: "environment.deleted",
    entityType: "environment",
    entityId: existing.id,
    metadata: {
      display_name: existing.display_name,
      color_tag: existing.color_tag,
    },
    req,
  });

  return { success: true };
}
