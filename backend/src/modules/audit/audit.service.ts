const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type AuditFilters = {
  action?: string;
  entity_type?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export async function listAuditLogs(userId: string, filters: AuditFilters) {
  const where: any = { user_id: userId };

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.entity_type) {
    where.entity_type = filters.entity_type;
  }

  if (filters.from || filters.to) {
    where.created_at = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        metadata: true,
        ip_address: true,
        created_at: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return {
    entries: rows.map((row: any) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metadata: row.metadata,
      ip_address: row.ip_address,
      created_at: row.created_at.toISOString(),
    })),
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
