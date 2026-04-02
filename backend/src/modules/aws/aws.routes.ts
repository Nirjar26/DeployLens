import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter, sensitiveActionRateLimiter } from "../../middleware/rateLimit";
import * as awsController from "./aws.controller";

const router = Router();
router.use(apiRateLimiter);

router.post("/aws", sensitiveActionRateLimiter, verifyToken, awsController.connectAws);
router.get("/aws", verifyToken, awsController.getAwsConnection);
router.delete("/aws", sensitiveActionRateLimiter, verifyToken, awsController.deleteAwsConnection);
router.get("/sync-status", verifyToken, awsController.getSyncStatus);

router.get("/applications", verifyToken, awsController.getApplications);
router.get("/deployment-groups", verifyToken, awsController.getDeploymentGroups);
router.get("/deployments", verifyToken, awsController.getDeployments);
router.get("/deployments/:deploymentId/events", verifyToken, awsController.getDeploymentEvents);

export default router;
