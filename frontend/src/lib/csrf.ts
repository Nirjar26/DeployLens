import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export function clearCsrfToken() {
  csrfToken = null;
}

export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && csrfToken) {
    return csrfToken;
  }

  if (!forceRefresh && csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = axios
    .get(`${baseURL}/api/auth/csrf-token`, {
      withCredentials: true,
    })
    .then((response) => {
      const token = response.data?.data?.csrfToken as string | undefined;

      if (!token) {
        throw new Error("CSRF token endpoint did not return a token");
      }

      csrfToken = token;
      return token;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}
