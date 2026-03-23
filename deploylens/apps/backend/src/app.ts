import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import aggregatorRouter from "./modules/aggregator/aggregator.routes";
import awsRouter from "./modules/aws/aws.routes";
import deploymentRouter from "./modules/deployments/deployment.routes";
import environmentRouter from "./modules/environments/environment.routes";
import githubRouter from "./modules/github/github.routes";
import webhookRouter from "./modules/webhooks/webhook.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

dotenv.config();

const app = express();
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(requestLogger);

// Webhook routes must be mounted before JSON body parsing for signature validation.
app.use("/api/webhooks", webhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/github", githubRouter);
app.use("/api/settings", awsRouter);
app.use("/api/aws", awsRouter);
app.use("/api/environments", environmentRouter);
app.use("/api/aggregator", aggregatorRouter);
app.use("/api/deployments", deploymentRouter);
app.use(errorHandler);

export default app;
