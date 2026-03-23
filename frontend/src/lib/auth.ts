import axios from "axios";
import { reconnectSocket } from "./socket";

let accessToken: string | null = null;

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export async function refreshAccessToken(): Promise<string> {
  const response = await axios.post(
    `${baseURL}/api/auth/refresh`,
    {},
    {
      withCredentials: true,
    },
  );

  const token = response.data?.data?.accessToken as string | undefined;

  if (!token) {
    throw new Error("Refresh did not return an access token");
  }

  setAccessToken(token);
  reconnectSocket(token);
  return token;
}
