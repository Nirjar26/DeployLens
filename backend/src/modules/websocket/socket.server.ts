import http from "http";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { verifySocketToken } from "./socket.middleware";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./socket.types";

const prisma = new PrismaClient();

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export function initSocketServer(httpServer: http.Server): void {
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.join(`user:${userId}`);

    console.log(`Socket connected: userId=${userId} socketId=${socket.id}`);

    socket.on("watch:deployment", async (deploymentId: string) => {
      const valid = await validateDeploymentOwnership(deploymentId, userId);
      if (valid) {
        socket.join(`deployment:${deploymentId}`);
      }
    });

    socket.on("unwatch:deployment", (deploymentId: string) => {
      socket.leave(`deployment:${deploymentId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: userId=${userId} reason=${reason}`);
    });

    socket.on("error", (err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Socket error: userId=${userId}`, message);
    });
  });

  console.log("Socket.io server initialized");
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}

async function validateDeploymentOwnership(deploymentId: string, userId: string): Promise<boolean> {
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      user_id: userId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(deployment);
}
