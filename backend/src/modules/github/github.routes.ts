import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as githubController from "./github.controller";

const router = Router();

router.get("/connection", verifyToken, githubController.getConnectionStatus);
router.delete("/connection", verifyToken, githubController.disconnectGithub);
router.get("/repos", verifyToken, githubController.getRepos);
router.post("/repos/track", verifyToken, githubController.trackRepos);
router.get("/repos/tracked", verifyToken, githubController.getTrackedRepos);
router.get("/repos/stats", verifyToken, githubController.getRepoStats);
router.get("/repos/:repoId/webhook-secret", verifyToken, githubController.getWebhookSecret);
router.post("/repos/:repoId/sync", verifyToken, githubController.syncRepo);
router.delete("/repos/:repoId/untrack", verifyToken, githubController.untrackRepo);
router.get("/token-status", verifyToken, githubController.getTokenStatus);
router.get("/runs", verifyToken, githubController.getRuns);
router.post("/runs/:runId/rerun", verifyToken, githubController.rerunWorkflow);

export default router;
