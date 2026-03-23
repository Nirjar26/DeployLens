import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as analyticsController from "./analytics.controller";

const router = Router();

router.use(verifyToken);
router.get("/overview", analyticsController.getOverview);
router.get("/frequency", analyticsController.getFrequency);
router.get("/duration-trend", analyticsController.getDurationTrend);
router.get("/by-repo", analyticsController.getByRepo);
router.get("/by-environment", analyticsController.getByEnvironment);
router.get("/mttr", analyticsController.getMttr);

export default router;
