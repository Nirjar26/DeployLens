import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as awsController from "./aws.controller";

const router = Router();

router.post("/aws", verifyToken, awsController.connectAws);
router.get("/aws", verifyToken, awsController.getAwsConnection);
router.delete("/aws", verifyToken, awsController.deleteAwsConnection);
router.get("/sync-status", verifyToken, awsController.getSyncStatus);

router.get("/applications", verifyToken, awsController.getApplications);
router.get("/deployment-groups", verifyToken, awsController.getDeploymentGroups);
router.get("/deployments", verifyToken, awsController.getDeployments);
router.get("/deployments/:deploymentId/events", verifyToken, awsController.getDeploymentEvents);

export default router;
