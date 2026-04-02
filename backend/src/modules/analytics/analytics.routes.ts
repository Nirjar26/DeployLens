import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter } from "../../middleware/rateLimit";
import * as analyticsController from "./analytics.controller";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);
router.get("/overview", analyticsController.getOverview);
router.get("/frequency", analyticsController.getFrequency);
router.get("/duration-trend", analyticsController.getDurationTrend);
router.get("/by-repo", analyticsController.getByRepo);
router.get("/by-environment", analyticsController.getByEnvironment);
router.get("/mttr", analyticsController.getMttr);

export default router;
