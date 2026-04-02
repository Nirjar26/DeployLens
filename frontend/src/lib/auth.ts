import axios from "axios";
import { reconnectSocket } from "./socket";
import { clearCsrfToken, getCsrfToken } from "./csrf";

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
  clearCsrfToken();
}

export async function refreshAccessToken(): Promise<string> {
  const csrfToken = await getCsrfToken();

  const response = await axios.post(
    `${baseURL}/api/auth/refresh`,
    {},
    {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
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
