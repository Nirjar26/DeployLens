import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAuthStore } from "../store/authStore";

export function useSocket(): void {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
    }
  }, [isAuthenticated]);
}
