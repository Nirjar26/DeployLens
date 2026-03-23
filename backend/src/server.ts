import "dotenv/config";
import http from "http";
import { validateEnv } from "./utils/validateEnv";
import { startGithubPoller } from "./jobs/githubPoller";
import { startCodeDeployPoller } from "./jobs/codedeployPoller";
import { startAggregatorJob } from "./modules/aggregator/aggregator.job";
import { initSocketServer } from "./modules/websocket/socket.server";

validateEnv();
const app = require("./app").default;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PORT = parseInt(process.env.PORT!);

async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected: true");
  } catch (error) {
    console.error("Database connected: false");
    console.error(error);
    process.exit(1);
  }

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`DeployLens backend running on port ${PORT}`);
    startGithubPoller();
    startCodeDeployPoller();
    startAggregatorJob();
  });
}

void start();
