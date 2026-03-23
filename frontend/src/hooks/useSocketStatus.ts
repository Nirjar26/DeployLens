import { useEffect, useState } from "react";
import { getRawSocket } from "../lib/socket";
import type { SocketStatus } from "../types/socket.types";

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(() => (getRawSocket()?.connected ? "connected" : "disconnected"));

  useEffect(() => {
    const socket = getRawSocket();

    if (!socket) {
      setStatus("disconnected");
      return;
    }

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onReconnecting = () => setStatus("connecting");
    const onConnectError = () => setStatus("disconnected");

    setStatus(socket.connected ? "connected" : "disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnecting);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnecting);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return status;
}
