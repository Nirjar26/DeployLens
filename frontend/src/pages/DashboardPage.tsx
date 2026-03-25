import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import DeploymentDrawer from "../components/dashboard/DeploymentDrawer";
import DeploymentModal from "../components/dashboard/DeploymentModal";
import ConnectionStatus from "../components/dashboard/ConnectionStatus";
import CompareModal from "../components/dashboard/CompareModal";
import EnvironmentSwimlanes from "../components/dashboard/EnvironmentSwimlanes";
import FilterBar from "../components/dashboard/FilterBar";
import PipelineTable from "../components/dashboard/PipelineTable";
import StatsRow from "../components/dashboard/StatsRow";
import ActiveDeploymentsBanner from "../components/dashboard/ActiveDeploymentsBanner";
import FailedDeploymentAlert from "../components/dashboard/FailedDeploymentAlert";
import StatusFilterChips from "../components/dashboard/StatusFilterChips";
import DensityToggle from "../components/dashboard/DensityToggle";
import ExportButton from "../components/dashboard/ExportButton";
import LastGoodDeploy from "../components/dashboard/LastGoodDeploy";
import TopDeployers from "../components/dashboard/TopDeployers";
import LongRunningWarning from "../components/dashboard/LongRunningWarning";
import PageHeader from "../components/layout/PageHeader";
import KeyboardShortcutsModal from "../components/dashboard/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDeploymentSocket } from "../hooks/useDeploymentSocket";
import { useAuthStore } from "../store/authStore";
import { useDeploymentStore } from "../store/deploymentStore";

export default function DashboardPage() {
  useDeploymentSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const githubUsername = useAuthStore((state) => state.githubUsername);

  const deployments = useDeploymentStore((state) => state.deployments);
  const pagination = useDeploymentStore((state) => state.pagination);
  const filters = useDeploymentStore((state) => state.filters);
  const stats = useDeploymentStore((state) => state.stats);
  const environmentLatest = useDeploymentStore((state) => state.environmentLatest);
  const isLoading = useDeploymentStore((state) => state.isLoading);
  const isLoadingStats = useDeploymentStore((state) => state.isLoadingStats);
  const isLoadingDetail = useDeploymentStore((state) => state.isLoadingDetail);
  const selectedDeploymentId = useDeploymentStore((state) => state.selectedDeploymentId);
  const selectedDeployment = useDeploymentStore((state) => state.selectedDeployment);
  const activeView = useDeploymentStore((state) => state.activeView);
  const modalOpen = useDeploymentStore((state) => state.modalOpen);

  const setFilter = useDeploymentStore((state) => state.setFilter);
  const clearFilters = useDeploymentStore((state) => state.clearFilters);
  const setPage = useDeploymentStore((state) => state.setPage);
  const setSort = useDeploymentStore((state) => state.setSort);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);
  const closeDrawer = useDeploymentStore((state) => state.closeDrawer);
  const openModal = useDeploymentStore((state) => state.openModal);
  const closeModal = useDeploymentStore((state) => state.closeModal);
  const setView = useDeploymentStore((state) => state.setView);
  const fetchEnvironmentLatest = useDeploymentStore((state) => state.fetchEnvironmentLatest);
  const setFiltersFromQuery = useDeploymentStore((state) => state.setFiltersFromQuery);
  const fetchDeployments = useDeploymentStore((state) => state.fetchDeployments);
  const fetchStats = useDeploymentStore((state) => state.fetchStats);
  const hasInitializedFromUrl = useRef(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [density, setDensity] = useState<"compact" | "default" | "comfortable">(() => {
    const stored = localStorage.getItem("deploylens-density");
    return (stored as any) || "default";
  });

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const handleChangeFilter = useCallback((key: Parameters<typeof setFilter>[0], value: Parameters<typeof setFilter>[1]) => {
    void setFilter(key, value);
  }, [setFilter]);

  const handleClearFilters = useCallback(() => {
    void clearFilters();
  }, [clearFilters]);

  const handleSetPage = useCallback((page: number) => {
    void setPage(page);
  }, [setPage]);

  const handleToggleMine = useCallback((triggeredBy: string | null) => {
    if (triggeredBy === null) {
      void setFilter("triggered_by", "");
    } else if (githubUsername) {
      void setFilter("triggered_by", githubUsername);
    }
  }, [setFilter, githubUsername]);

  const handleOpenDrawer = useCallback((id: string) => {
    void openDrawer(id);
  }, [openDrawer]);

  const handleOpenModal = useCallback((id: string) => {
    void openModal(id);
  }, [openModal]);

  const handleToggleCompareSelection = useCallback((id: string) => {
    setCompareSelection((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 2) {
        return [current[1], id];
      }

      return [...current, id];
    });
  }, []);

  useEffect(() => {
    if (hasInitializedFromUrl.current) {
      return;
    }

    hasInitializedFromUrl.current = true;

    const parsed = {
      repo: searchParams.get("repo") ?? "",
      environment: searchParams.get("environment") ?? "",
      status: searchParams.get("status") ?? "",
      branch: searchParams.get("branch") ?? "",
      triggered_by: searchParams.get("triggered_by") ?? "",
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
      limit: Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      sortBy: (searchParams.get("sort_by") as "created_at" | "duration_seconds" | "unified_status" | null) ?? "created_at",
      sortDir: (searchParams.get("sort_dir") as "asc" | "desc" | null) ?? "desc",
    };

    setFiltersFromQuery(parsed);
    void Promise.all([fetchStats(), fetchDeployments()]);
  }, [fetchDeployments, fetchStats, searchParams, setFiltersFromQuery]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.repo) next.set("repo", filters.repo);
    if (filters.environment) next.set("environment", filters.environment);
    if (filters.status) next.set("status", filters.status);
    if (filters.branch) next.set("branch", filters.branch);
    if (filters.triggered_by) next.set("triggered_by", filters.triggered_by);
    if (filters.from) next.set("from", filters.from);
    if (filters.to) next.set("to", filters.to);
    if (filters.sortBy) next.set("sort_by", filters.sortBy);
    if (filters.sortDir) next.set("sort_dir", filters.sortDir);
    next.set("page", String(filters.page));
    next.set("limit", String(filters.limit));

    const nextQuery = next.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      setSearchParams(next, { replace: true });
    }
  }, [filters, setSearchParams]);

  useEffect(() => {
    if (activeView === "environments") {
      void fetchEnvironmentLatest();
    }
  }, [activeView, fetchEnvironmentLatest]);

  useEffect(() => {
    localStorage.setItem("deploylens-density", density);
  }, [density]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: "/",
        handler: () => {
          const branchInput = document.querySelector('[data-branch-input]') as HTMLInputElement;
          branchInput?.focus();
        },
        skipWhenTyping: false,
      },
      {
        key: "r",
        handler: () => {
          void fetchStats();
          void fetchDeployments();
        },
        skipWhenTyping: true,
      },
      {
        key: "Escape",
        handler: () => {
          closeDrawer();
          closeModal();
        },
      },
      {
        key: "?",
        handler: () => {
          setShortcutsModalOpen(true);
        },
        skipWhenTyping: true,
      },
    ],
    true
  );
  useEffect(() => {
    return () => {
      closeDrawer();
      closeModal();
    };
  }, [closeDrawer, closeModal, location.pathname]);

  useEffect(() => {
    if (!compareMode) {
      setCompareSelection([]);
      setCompareModalOpen(false);
    }
  }, [compareMode]);

  const hasFilters = useMemo(
    () => Boolean(filters.repo || filters.environment || filters.status || filters.branch || filters.from || filters.to || filters.triggered_by),
    [filters],
  );

  return (
    <>
      <PageHeader
        title="Deployments"
        actions={<ConnectionStatus />}
      />

      <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <ActiveDeploymentsBanner />
        <StatsRow stats={stats} isLoading={isLoadingStats} />

        {activeView === "pipeline" ? (
          <>
            <LongRunningWarning />
            <LastGoodDeploy />
            <TopDeployers stats={stats} />
            <FailedDeploymentAlert />
            <FilterBar
              filters={filters}
              onChangeFilter={handleChangeFilter}
              onClear={handleClearFilters}
              compareMode={compareMode}
              onToggleCompareMode={() => setCompareMode((value) => !value)}
              onToggleMine={githubUsername ? handleToggleMine : undefined}
            />
            <StatusFilterChips stats={stats} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "8px" }}>
              <ExportButton filters={filters} />
              <DensityToggle density={density} onChangeDensity={setDensity} />
            </div>
            <PipelineTable
              rows={deployments}
              pagination={pagination}
              isLoading={isLoading}
              hasFilters={hasFilters}
              filters={filters}
              onOpen={handleOpenDrawer}
              onClearFilters={handleClearFilters}
              onSetPage={handleSetPage}
              onSetLimit={(limit) => handleChangeFilter("limit", limit)}
              compareMode={compareMode}
              compareSelection={compareSelection}
              onToggleCompareSelection={handleToggleCompareSelection}
              onOpenCompare={() => setCompareModalOpen(true)}
              sortBy={(filters.sortBy as any) || "created_at"}
              sortDir={(filters.sortDir as any) || "desc"}
              onSort={setSort}
              density={density}
            />
          </>
        ) : (
          <EnvironmentSwimlanes
            environments={environmentLatest}
            onOpen={handleOpenModal}
            onSelectEnvironment={(name) => {
              handleChangeFilter("environment", name);
              setView("pipeline");
            }}
          />
        )}
      </div>

      {/* Slide-in drawer for pipeline table rows */}
      <DeploymentDrawer
        open={Boolean(selectedDeploymentId) && !modalOpen}
        detail={selectedDeployment}
        isLoading={isLoadingDetail}
        onClose={closeDrawer}
        onOpenLinkedDeployment={handleOpenDrawer}
      />

      {/* Centered modal for environment cards */}
      <DeploymentModal
        open={modalOpen}
        detail={selectedDeployment}
        isLoading={isLoadingDetail}
        onClose={closeModal}
        onOpenLinkedDeployment={(id) => {
          closeModal();
          void openModal(id);
        }}
      />

      <CompareModal
        open={compareModalOpen && compareSelection.length === 2}
        deploymentAId={compareSelection[0] ?? null}
        deploymentBId={compareSelection[1] ?? null}
        onClose={() => setCompareModalOpen(false)}
      />

      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </>
  );
}
