import { create } from "zustand";
import { deployments } from "../lib/api";

export type DeploymentRow = {
  id: string;
  github_run_id: string | null;
  codedeploy_id: string | null;
  commit_sha: string;
  commit_sha_short: string;
  commit_message: string | null;
  branch: string;
  triggered_by: string | null;
  github_status: string | null;
  github_run_url: string | null;
  codedeploy_status: string | null;
  unified_status: "pending" | "running" | "success" | "failed" | "rolled_back";
  is_rollback: boolean;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  repository: {
    id: string;
    full_name: string;
    owner: string;
    name: string;
  };
  environment: {
    id: string;
    display_name: string;
    color_tag: string;
  } | null;
};

export type DeploymentDetail = DeploymentRow & {
  events: Array<{
    id: string;
    source: string;
    event_name: string;
    status: string;
    message: string | null;
    log_url: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_ms: number | null;
  }>;
  rollback_info: {
    rolled_back_from: {
      id: string;
      commit_sha_short: string;
      started_at: string;
    };
  } | null;
  can_rollback: boolean;
};

export type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type DeploymentStats = {
  total_today: number;
  success_today: number;
  failed_today: number;
  running_now: number;
  success_rate_7d: number;
  avg_duration_7d: number;
};

export type EnvironmentLatest = {
  environment: {
    id: string;
    display_name: string;
    color_tag: string;
  };
  latest_deployment: DeploymentRow | null;
  recent_deployments?: DeploymentRow[];
  total_today: number;
  success_rate: number;
};

export type DeploymentFilters = {
  repo: string;
  environment: string;
  status: string;
  branch: string;
  from: string;
  to: string;
  page: number;
  limit: number;
};

type DeploymentStore = {
  deployments: DeploymentRow[];
  pagination: PaginationInfo | null;
  selectedDeploymentId: string | null;
  selectedDeployment: DeploymentDetail | null;
  filters: DeploymentFilters;
  stats: DeploymentStats | null;
  environmentLatest: EnvironmentLatest[];
  isLoading: boolean;
  isLoadingDetail: boolean;
  isLoadingStats: boolean;
  activeView: "pipeline" | "environments";
  modalOpen: boolean;
  fetchDeployments: () => Promise<void>;
  fetchDeploymentDetail: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchEnvironmentLatest: () => Promise<void>;
  setFilter: (key: keyof Omit<DeploymentFilters, "page" | "limit"> | "limit", value: string | number) => Promise<void>;
  clearFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  openDrawer: (id: string) => Promise<void>;
  closeDrawer: () => void;
  openModal: (id: string) => Promise<void>;
  closeModal: () => void;
  setView: (view: "pipeline" | "environments") => void;
  setFiltersFromQuery: (partial: Partial<DeploymentFilters>) => void;
  updateDeployment: (id: string, data: Partial<DeploymentRow>) => void;
};

const defaultFilters: DeploymentFilters = {
  repo: "",
  environment: "",
  status: "",
  branch: "",
  from: "",
  to: "",
  page: 1,
  limit: 20,
};

export const useDeploymentStore = create<DeploymentStore>((set, get) => ({
  deployments: [],
  pagination: null,
  selectedDeploymentId: null,
  selectedDeployment: null,
  filters: defaultFilters,
  stats: null,
  environmentLatest: [],
  isLoading: false,
  isLoadingDetail: false,
  isLoadingStats: false,
  activeView: "pipeline",
  modalOpen: false,

  fetchDeployments: async () => {
    set({ isLoading: true });
    try {
      const response = await deployments.list(get().filters);
      set({ deployments: response.deployments, pagination: response.pagination, isLoading: false });
    } catch {
      set({ deployments: [], pagination: null, isLoading: false });
    }
  },

  fetchDeploymentDetail: async (id) => {
    set({ isLoadingDetail: true });
    try {
      const detail = await deployments.getById(id);
      set({ selectedDeployment: detail, isLoadingDetail: false });
    } catch {
      set({ selectedDeployment: null, isLoadingDetail: false });
    }
  },

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      const stats = await deployments.getStats();
      set({ stats, isLoadingStats: false });
    } catch {
      set({ stats: null, isLoadingStats: false });
    }
  },

  fetchEnvironmentLatest: async () => {
    try {
      const data = await deployments.getEnvironmentLatest();
      set({ environmentLatest: data.environments ?? [] });
    } catch {
      set({ environmentLatest: [] });
    }
  },

  setFilter: async (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        page: 1,
      },
    }));

    await get().fetchDeployments();
  },

  clearFilters: async () => {
    set({ filters: defaultFilters });
    await get().fetchDeployments();
  },

  setPage: async (page) => {
    set((state) => ({ filters: { ...state.filters, page } }));
    await get().fetchDeployments();
  },

  openDrawer: async (id) => {
    set({ selectedDeploymentId: id });
    await get().fetchDeploymentDetail(id);
  },

  closeDrawer: () => {
    set({ selectedDeploymentId: null, selectedDeployment: null });
  },

  openModal: async (id) => {
    set({ modalOpen: true, selectedDeploymentId: id });
    await get().fetchDeploymentDetail(id);
  },

  closeModal: () => {
    set({ modalOpen: false, selectedDeploymentId: null, selectedDeployment: null });
  },

  setView: (view) => {
    set({ activeView: view });
  },

  setFiltersFromQuery: (partial) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
      },
    }));
  },

  updateDeployment: (id, data) => {
    set((state) => ({
      deployments: state.deployments.map((item) => (item.id === id ? { ...item, ...data } : item)),
      selectedDeployment: state.selectedDeployment?.id === id
        ? { ...state.selectedDeployment, ...data }
        : state.selectedDeployment,
      environmentLatest: state.environmentLatest.map((entry) => ({
        ...entry,
        latest_deployment: entry.latest_deployment?.id === id
          ? { ...entry.latest_deployment, ...data }
          : entry.latest_deployment,
      })),
    }));
  },
}));
