import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter } from "../../middleware/rateLimit";
import * as auditController from "./audit.controller";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);
router.get("/", auditController.getAuditLogs);

export default router;
