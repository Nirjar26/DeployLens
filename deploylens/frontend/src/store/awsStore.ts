import { create } from "zustand";
import { aws, environments } from "../lib/api";

export type EnvironmentItem = {
  id: string;
  repository_id: string;
  repository_full_name: string;
  codedeploy_app: string;
  codedeploy_group: string;
  display_name: string;
  color_tag: string;
  created_at: string;
};

type AwsStoreState = {
  awsConnected: boolean;
  awsAccountId: string | null;
  awsRegion: string | null;
  awsAccountAlias: string | null;
  environments: EnvironmentItem[];
  applications: string[];
  isLoadingApplications: boolean;
  isLoadingEnvironments: boolean;
  isConnecting: boolean;
  connectAws: (credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    accountAlias?: string;
  }) => Promise<void>;
  disconnectAws: () => Promise<void>;
  fetchAwsStatus: () => Promise<void>;
  fetchApplications: () => Promise<void>;
  fetchEnvironments: () => Promise<void>;
  addEnvironment: (payload: {
    repository_id: string;
    codedeploy_app: string;
    codedeploy_group: string;
    display_name: string;
    color_tag: string;
  }) => Promise<void>;
  updateEnvironment: (id: string, payload: { display_name?: string; color_tag?: string }) => Promise<void>;
  removeEnvironment: (id: string) => Promise<void>;
  clearAwsState: () => void;
};

export const useAwsStore = create<AwsStoreState>((set) => ({
  awsConnected: false,
  awsAccountId: null,
  awsRegion: null,
  awsAccountAlias: null,
  environments: [],
  applications: [],
  isLoadingApplications: false,
  isLoadingEnvironments: false,
  isConnecting: false,

  connectAws: async (credentials) => {
    set({ isConnecting: true });
    try {
      const response = await aws.connect(credentials);
      set({
        awsConnected: Boolean(response.connected),
        awsAccountId: response.accountId ?? null,
        awsRegion: response.region ?? null,
        awsAccountAlias: response.accountAlias ?? null,
        isConnecting: false,
      });
    } catch (error) {
      set({ isConnecting: false });
      throw error;
    }
  },

  disconnectAws: async () => {
    await aws.disconnect();
    set({
      awsConnected: false,
      awsAccountId: null,
      awsRegion: null,
      awsAccountAlias: null,
      applications: [],
      environments: [],
    });
  },

  fetchAwsStatus: async () => {
    const status = await aws.getStatus();
    set({
      awsConnected: Boolean(status.connected),
      awsAccountId: status.connected ? status.accountId ?? null : null,
      awsRegion: status.connected ? status.region ?? null : null,
      awsAccountAlias: status.connected ? status.accountAlias ?? null : null,
    });
  },

  fetchApplications: async () => {
    set({ isLoadingApplications: true });
    try {
      const result = await aws.getApplications();
      set({ applications: result.applications ?? [], isLoadingApplications: false });
    } catch {
      set({ isLoadingApplications: false });
      throw new Error("Failed to load applications");
    }
  },

  fetchEnvironments: async () => {
    set({ isLoadingEnvironments: true });
    try {
      const result = await environments.list();
      set({ environments: result, isLoadingEnvironments: false });
    } catch {
      set({ isLoadingEnvironments: false });
      throw new Error("Failed to load environments");
    }
  },

  addEnvironment: async (payload) => {
    const result = await environments.create(payload);
    set((state) => ({ environments: [...state.environments, result] }));
  },

  updateEnvironment: async (id, payload) => {
    const result = await environments.update(id, payload);
    set((state) => ({
      environments: state.environments.map((item) =>
        item.id === id
          ? {
            ...item,
            display_name: result.display_name,
            color_tag: result.color_tag,
          }
          : item,
      ),
    }));
  },

  removeEnvironment: async (id) => {
    await environments.delete(id);
    set((state) => ({ environments: state.environments.filter((item) => item.id !== id) }));
  },

  clearAwsState: () => {
    set({
      awsConnected: false,
      awsAccountId: null,
      awsRegion: null,
      awsAccountAlias: null,
      environments: [],
      applications: [],
      isLoadingApplications: false,
      isLoadingEnvironments: false,
      isConnecting: false,
    });
  },
}));
