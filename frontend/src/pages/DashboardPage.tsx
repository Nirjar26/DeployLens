import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import DeploymentDrawer from "../components/dashboard/DeploymentDrawer";
import EnvironmentSwimlanes from "../components/dashboard/EnvironmentSwimlanes";
import FilterBar from "../components/dashboard/FilterBar";
import PipelineTable from "../components/dashboard/PipelineTable";
import StatsRow from "../components/dashboard/StatsRow";
import { useAuthStore } from "../store/authStore";
import { useDeploymentStore } from "../store/deploymentStore";

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
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

  const setFilter = useDeploymentStore((state) => state.setFilter);
  const clearFilters = useDeploymentStore((state) => state.clearFilters);
  const setPage = useDeploymentStore((state) => state.setPage);
  const openDrawer = useDeploymentStore((state) => state.openDrawer);
  const closeDrawer = useDeploymentStore((state) => state.closeDrawer);
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
    };
  }, [closeDrawer, location.pathname]);

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
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-logo">DeployLens</div>
          <p className="dashboard-user-email">{user?.email}</p>
          <nav className="dashboard-nav">
            <Link to="/dashboard" className="nav-item nav-item-active"><LayoutDashboard size={16} /> Dashboard</Link>
            <Link to="/settings" className="nav-item"><Settings size={16} /> Settings</Link>
          </nav>
        </div>
        <button type="button" className="nav-item nav-logout" onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <h1>Deployments</h1>
          <div className="view-toggle">
            <button type="button" className={`auth-btn ${activeView === "pipeline" ? "auth-btn-primary" : "auth-btn-secondary"}`} onClick={() => setView("pipeline")}>Pipeline</button>
            <button type="button" className={`auth-btn ${activeView === "environments" ? "auth-btn-primary" : "auth-btn-secondary"}`} onClick={() => setView("environments")}>Environments</button>
          </div>
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
            onOpen={handleOpenDrawer}
            onSelectEnvironment={(name) => {
              handleChangeFilter("environment", name);
              setView("pipeline");
            }}
          />
        )}
      </main>

      <DeploymentDrawer
        open={Boolean(selectedDeploymentId)}
        detail={selectedDeployment}
        isLoading={isLoadingDetail}
        onClose={closeDrawer}
        onOpenLinkedDeployment={handleOpenDrawer}
      />
    </div>
  );
}
