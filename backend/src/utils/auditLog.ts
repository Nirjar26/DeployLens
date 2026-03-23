import { Request } from "express";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type AuditLogParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        metadata: params.metadata ?? null,
        ip_address: params.req?.ip ?? null,
        user_agent: typeof params.req?.headers["user-agent"] === "string"
          ? params.req.headers["user-agent"]
          : null,
      },
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
