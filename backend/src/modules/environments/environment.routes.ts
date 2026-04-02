import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter, sensitiveActionRateLimiter } from "../../middleware/rateLimit";
import * as environmentController from "./environment.controller";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);
router.post("/", sensitiveActionRateLimiter, environmentController.createEnvironment);
router.get("/", environmentController.getEnvironments);
router.get("/stats", environmentController.getEnvironmentStats);
router.post("/:id/test", sensitiveActionRateLimiter, environmentController.testEnvironment);
router.put("/:id", sensitiveActionRateLimiter, environmentController.updateEnvironment);
router.delete("/:id", sensitiveActionRateLimiter, environmentController.deleteEnvironment);

export default router;
