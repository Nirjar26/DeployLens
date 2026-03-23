import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../utils/response";
import * as auditService from "./audit.service";

const querySchema = z.object({
  action: z.string().min(1).optional(),
  entity_type: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const query = querySchema.parse(req.query);
    const data = await auditService.listAuditLogs(req.user.id, query);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
