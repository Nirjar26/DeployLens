import { create } from "zustand";
import api, { TrackedRepo, github } from "../lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/auth";
import { useAwsStore } from "./awsStore";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  githubConnected: boolean;
  githubUsername: string | null;
  trackedRepos: TrackedRepo[];
  isLoadingRepos: boolean;
  setUser: (user: AuthUser, accessToken: string) => void;
  setGithubConnected: (username: string | null) => void;
  setTrackedRepos: (repos: TrackedRepo[]) => void;
  fetchTrackedRepos: () => Promise<void>;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  initAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  githubConnected: false,
  githubUsername: null,
  trackedRepos: [],
  isLoadingRepos: false,
  setUser: (user, token) => {
    setAccessToken(token);
    set({ user, accessToken: token, isAuthenticated: true, isLoading: false, isInitialized: true });
  },
  setGithubConnected: (username) => {
    set({ githubConnected: Boolean(username), githubUsername: username });
  },
  setTrackedRepos: (repos) => {
    set({ trackedRepos: repos });
  },
  fetchTrackedRepos: async () => {
    set({ isLoadingRepos: true });
    try {
      const [repos, connection] = await Promise.all([github.getTrackedRepos(), github.getConnection()]);
      set({
        trackedRepos: repos,
        githubConnected: connection.connected,
        githubUsername: connection.username,
        isLoadingRepos: false,
      });
    } catch {
      set({ isLoadingRepos: false });
    }
  },
  clearAuth: () => {
    clearAccessToken();
    useAwsStore.getState().clearAwsState();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      githubConnected: false,
      githubUsername: null,
      trackedRepos: [],
      isLoadingRepos: false,
    });
  },
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const data = response.data?.data;
      setAccessToken(data.accessToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      await useAuthStore.getState().fetchTrackedRepos();
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
      throw error;
    }
  },
  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post("/api/auth/register", { name, email, password });
      const data = response.data?.data;
      setAccessToken(data.accessToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      await useAuthStore.getState().fetchTrackedRepos();
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
      throw error;
    }
  },
  initAuth: async () => {
    set({ isLoading: true });

    try {
      const response = await api.get("/api/auth/me");
      const user = response.data?.data as AuthUser;
      const token = getAccessToken();

      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      await useAuthStore.getState().fetchTrackedRepos();
      await useAwsStore.getState().fetchAwsStatus();
      if (useAwsStore.getState().awsConnected) {
        await useAwsStore.getState().fetchEnvironments();
      }
    } catch {
      clearAccessToken();
      useAwsStore.getState().clearAwsState();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        githubConnected: false,
        githubUsername: null,
        trackedRepos: [],
        isLoadingRepos: false,
      });
    }
  },
}));
