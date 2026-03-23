import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as githubController from "./github.controller";

const router = Router();

router.get("/connection", verifyToken, githubController.getConnectionStatus);
router.delete("/connection", verifyToken, githubController.disconnectGithub);
router.get("/repos", verifyToken, githubController.getRepos);
router.post("/repos/track", verifyToken, githubController.trackRepos);
router.get("/repos/tracked", verifyToken, githubController.getTrackedRepos);
router.delete("/repos/:repoId/untrack", verifyToken, githubController.untrackRepo);
router.get("/runs", verifyToken, githubController.getRuns);
router.post("/runs/:runId/rerun", verifyToken, githubController.rerunWorkflow);

export default router;
