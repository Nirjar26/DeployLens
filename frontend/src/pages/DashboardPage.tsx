import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import DeploymentDrawer from "../components/dashboard/DeploymentDrawer";
import DeploymentModal from "../components/dashboard/DeploymentModal";
import EnvironmentSwimlanes from "../components/dashboard/EnvironmentSwimlanes";
import FilterBar from "../components/dashboard/FilterBar";
import PipelineTable from "../components/dashboard/PipelineTable";
import Sidebar from "../components/dashboard/Sidebar";
import StatsRow from "../components/dashboard/StatsRow";
import { useAuthStore } from "../store/authStore";
import { useDeploymentStore } from "../store/deploymentStore";

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clearAuth = useAuthStore((state) => state.clearAuth);

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

  const handleChangeFilter = useCallback((key: Parameters<typeof setFilter>[0], value: Parameters<typeof setFilter>[1]) => {
    void setFilter(key, value);
  }, [setFilter]);

  const handleClearFilters = useCallback(() => {
    void clearFilters();
  }, [clearFilters]);

  const handleSetPage = useCallback((page: number) => {
    void setPage(page);
  }, [setPage]);

  const handleOpenDrawer = useCallback((id: string) => {
    void openDrawer(id);
  }, [openDrawer]);

  const handleOpenModal = useCallback((id: string) => {
    void openModal(id);
  }, [openModal]);

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
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
      limit: Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20,
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
    if (filters.from) next.set("from", filters.from);
    if (filters.to) next.set("to", filters.to);
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
    return () => {
      closeDrawer();
      closeModal();
    };
  }, [closeDrawer, closeModal, location.pathname]);

  const hasFilters = useMemo(
    () => Boolean(filters.repo || filters.environment || filters.status || filters.branch || filters.from || filters.to),
    [filters],
  );

  async function handleLogout() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore and clear local state
    }

    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dl-dashboard-shell">
      <Sidebar onLogout={handleLogout} />

      <main className="dl-dashboard-main">
        <header className="dl-dashboard-topbar">
          <h1 className="dl-page-title">Deployments</h1>
        </header>

        <StatsRow stats={stats} isLoading={isLoadingStats} />

        {activeView === "pipeline" ? (
          <>
            <FilterBar
              filters={filters}
              onChangeFilter={handleChangeFilter}
              onClear={handleClearFilters}
            />
            <PipelineTable
              rows={deployments}
              pagination={pagination}
              isLoading={isLoading}
              hasFilters={hasFilters}
              onOpen={handleOpenDrawer}
              onClearFilters={handleClearFilters}
              onSetPage={handleSetPage}
              onSetLimit={(limit) => handleChangeFilter("limit", limit)}
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
      </main>

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
    </div>
  );
}
