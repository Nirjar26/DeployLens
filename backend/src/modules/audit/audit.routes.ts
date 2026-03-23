import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as auditController from "./audit.controller";

const router = Router();

router.use(verifyToken);
router.get("/", auditController.getAuditLogs);

export default router;
