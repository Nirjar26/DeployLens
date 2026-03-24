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
import PageHeader from "../components/layout/PageHeader";
import { useDeploymentSocket } from "../hooks/useDeploymentSocket";
import { useAuthStore } from "../store/authStore";
import { useDeploymentStore } from "../store/deploymentStore";

export default function DashboardPage() {
  useDeploymentSocket();
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
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

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

  useEffect(() => {
    if (!compareMode) {
      setCompareSelection([]);
      setCompareModalOpen(false);
    }
  }, [compareMode]);

  const hasFilters = useMemo(
    () => Boolean(filters.repo || filters.environment || filters.status || filters.branch || filters.from || filters.to),
    [filters],
  );

  return (
    <>
      <PageHeader
        title="Deployments"
        actions={<ConnectionStatus />}
      />

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <StatsRow stats={stats} isLoading={isLoadingStats} />

        {activeView === "pipeline" ? (
          <>
            <FilterBar
              filters={filters}
              onChangeFilter={handleChangeFilter}
              onClear={handleClearFilters}
              compareMode={compareMode}
              onToggleCompareMode={() => setCompareMode((value) => !value)}
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
              compareMode={compareMode}
              compareSelection={compareSelection}
              onToggleCompareSelection={handleToggleCompareSelection}
              onOpenCompare={() => setCompareModalOpen(true)}
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
    </>
  );
}
