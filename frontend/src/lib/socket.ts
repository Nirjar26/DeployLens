import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketStatus,
} from "../types/socket.types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const statusSubscribers = new Set<(status: SocketStatus) => void>();
let socket: AppSocket | null = null;
let socketStatus: SocketStatus = "disconnected";

function notifyStatus(status: SocketStatus): void {
  socketStatus = status;
  for (const subscriber of statusSubscribers) {
    subscriber(status);
  }
}

export function getSocketStatus(): SocketStatus {
  return socketStatus;
}

export function subscribeSocketStatus(listener: (status: SocketStatus) => void): () => void {
  statusSubscribers.add(listener);
  listener(socketStatus);

  return () => {
    statusSubscribers.delete(listener);
  };
}

export function getSocket(): AppSocket | null {
  return socket?.connected ? socket : null;
}

export function getRawSocket(): AppSocket | null {
  return socket;
}

export function connectSocket(accessToken: string): AppSocket {
  if (socket?.connected) {
    return socket;
  }

  const baseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
  notifyStatus("connecting");

  socket = io(baseUrl, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    notifyStatus("connected");
    console.log("Socket connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    notifyStatus("disconnected");
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    notifyStatus("disconnected");
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect") {
      socket?.close();
    }
  });

  socket.io.on("reconnect_attempt", () => {
    notifyStatus("connecting");
  });

  socket.io.on("reconnect", () => {
    notifyStatus("connected");
  });

  socket.io.on("reconnect_error", () => {
    notifyStatus("disconnected");
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  notifyStatus("disconnected");
}

export function reconnectSocket(accessToken: string): void {
  disconnectSocket();
  connectSocket(accessToken);
}

export function watchDeployment(deploymentId: string): void {
  socket?.emit("watch:deployment", deploymentId);
}

export function unwatchDeployment(deploymentId: string): void {
  socket?.emit("unwatch:deployment", deploymentId);
}
