import bcrypt from "bcrypt";
import { Request } from "express";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { writeAuditLog } from "../../utils/auditLog";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function issueRefreshToken(userId: string): Promise<string> {
  const { token, jti } = signRefreshToken(userId);
  const token_hash = await bcrypt.hash(token, 12);

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash,
      token_jti: jti,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

export async function updateProfile(userId: string, name: string, req?: Request) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await writeAuditLog({
    userId,
    action: "account.name_changed",
    entityType: "account",
    entityId: userId,
    metadata: { name },
    req,
  });

  return updated;
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string, req?: Request) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("WRONG_PASSWORD");
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    }),
    prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    }),
  ]);

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await issueRefreshToken(user.id);

  await writeAuditLog({
    userId,
    action: "account.password_changed",
    entityType: "account",
    entityId: userId,
    req,
  });

  return {
    accessToken,
    refreshToken,
  };
}

export async function deleteAccount(userId: string, password: string, req?: Request) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("WRONG_PASSWORD");
  }

  await writeAuditLog({
    userId,
    action: "account.deleted",
    entityType: "account",
    entityId: userId,
    metadata: {
      email: user.email,
    },
    req,
  });

  await prisma.$transaction(async (tx: any) => {
    const deploymentIds = (await tx.deployment.findMany({
      where: { user_id: userId },
      select: { id: true },
    })).map((item: { id: string }) => item.id);

    if (deploymentIds.length > 0) {
      await tx.deploymentEvent.deleteMany({
        where: {
          deployment_id: { in: deploymentIds },
        },
      });

      await tx.rollbackLog.deleteMany({
        where: {
          OR: [
            { deployment_id: { in: deploymentIds } },
            { target_deployment_id: { in: deploymentIds } },
          ],
        },
      });

      await tx.deployment.deleteMany({
        where: {
          id: { in: deploymentIds },
        },
      });
    }

    await tx.auditLog.deleteMany({ where: { user_id: userId } });
    await tx.environment.deleteMany({ where: { user_id: userId } });
    await tx.repository.deleteMany({ where: { user_id: userId } });
    await tx.githubConnection.deleteMany({ where: { user_id: userId } });
    await tx.awsConnection.deleteMany({ where: { user_id: userId } });
    await tx.refreshToken.deleteMany({ where: { user_id: userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return { success: true };
}
