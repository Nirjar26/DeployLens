import { Socket } from "socket.io";
import { verifyAccessToken } from "../../utils/jwt";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./socket.types";

export function verifySocketToken(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  next: (err?: Error) => void,
): void {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error("SOCKET_NO_TOKEN"));
    }

    const payload = verifyAccessToken(token);
    socket.data.userId = payload.sub;
    socket.data.email = payload.email;
    next();
  } catch {
    next(new Error("SOCKET_INVALID_TOKEN"));
  }
}
