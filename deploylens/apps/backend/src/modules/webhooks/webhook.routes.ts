import express, { Router } from "express";
import * as webhookController from "./webhook.controller";

const router = Router();

// After tracking a repo, add a GitHub webhook manually:
// Repo Settings -> Webhooks -> Add webhook
//   Payload URL: http://your-server/api/webhooks/github
//   Content type: application/json
//   Secret: webhook_secret stored on the repository row
//   Events: Workflow runs only
// For local development, use ngrok: ngrok http 3001
router.post("/github", express.raw({ type: "application/json" }), webhookController.githubWebhook);
router.post("/aws", express.raw({ type: "text/plain" }), webhookController.awsWebhook);

export default router;
