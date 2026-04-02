import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter, sensitiveActionRateLimiter } from "../../middleware/rateLimit";
import * as deploymentController from "./deployment.controller";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);
router.get("/", deploymentController.getDeployments);
router.get("/stats", deploymentController.getStats);
router.get("/last-good", deploymentController.getLastGoodDeployment);
router.get("/environments/latest", deploymentController.getEnvironmentsLatest);
router.get("/compare", deploymentController.compareDeployments);
router.post("/:id/promote", sensitiveActionRateLimiter, deploymentController.promoteDeployment);
router.get("/:id", deploymentController.getDeploymentById);

export default router;
