import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { analytics, AnalyticsRange } from "../lib/api";
import PageHeader from "../components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

type RepoRow = {
  repo_full_name: string;
  total: number;
  success: number;
  failed: number;
  success_rate: number;
  avg_duration_seconds: number;
  last_deployment_at: string;
};

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);

  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [overview, setOverview] = useState<any>(null);
  const [frequency, setFrequency] = useState<any[]>([]);
  const [durationTrend, setDurationTrend] = useState<any[]>([]);
  const [byRepo, setByRepo] = useState<RepoRow[]>([]);
  const [byEnvironment, setByEnvironment] = useState<any[]>([]);
  const [mttr, setMttr] = useState<{ avg_mttr_minutes: number; by_environment: Array<{ display_name: string; avg_mttr_minutes: number }> } | null>(null);

  const [repoSort, setRepoSort] = useState<{ key: keyof RepoRow; dir: "asc" | "desc" }>({
    key: "total",
    dir: "desc",
  });

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    void Promise.all([
      analytics.getOverview(range),
      analytics.getFrequency(range, groupBy),
      analytics.getDurationTrend(range, repoFilter || undefined),
      analytics.getByRepo(range),
      analytics.getByEnvironment(range),
      analytics.getMttr(range),
    ]).then(([overviewData, frequencyData, durationData, repoData, envData, mttrData]) => {
      if (!mounted) return;
      setOverview(overviewData);
      setFrequency(frequencyData ?? []);
      setDurationTrend(durationData ?? []);
      setByRepo(repoData ?? []);
      setByEnvironment(envData ?? []);
      setMttr(mttrData ?? { avg_mttr_minutes: 0, by_environment: [] });
      setIsLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setOverview(null);
      setFrequency([]);
      setDurationTrend([]);
      setByRepo([]);
      setByEnvironment([]);
      setMttr({ avg_mttr_minutes: 0, by_environment: [] });
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [range, groupBy, repoFilter]);

  const sortedByRepo = useMemo(() => {
    const list = [...byRepo];
    list.sort((a, b) => {
      const av = a[repoSort.key];
      const bv = b[repoSort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return repoSort.dir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [byRepo, repoSort]);

  function toggleRepoSort(key: keyof RepoRow) {
    setRepoSort((current) => {
      if (current.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" };
      }

      return { key, dir: key === "repo_full_name" ? "asc" : "desc" };
    });
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            {(["7d", "30d", "90d"] as AnalyticsRange[]).map((value) => (
              <button
                key={value}
                type="button"
                style={{
                  height: "28px",
                  padding: "0 14px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: range === value ? "var(--bg-surface)" : "transparent",
                  color: range === value ? "var(--text-primary)" : "var(--text-secondary)",
                  border: "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all var(--transition-base)",
                }}
                onClick={() => setRange(value)}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Overview cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}>
          {[
            { label: "Total", value: overview?.total_deployments ?? 0 },
            { label: "Success rate", value: `${overview?.success_rate ?? 0}%` },
            { label: "Failed", value: overview?.failed_count ?? 0 },
            { label: "Rollbacks", value: overview?.rollback_count ?? 0 },
            { label: "Avg duration", value: formatDuration(overview?.avg_duration_seconds ?? 0) },
            { label: "P95 duration", value: formatDuration(overview?.p95_duration_seconds ?? 0) },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-lg)",
                padding: "18px 20px",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "10px" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Charts and data sections - keeping existing structure but removing class names */}

        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h3>Deployment frequency</h3>
            <div className="analytics-segmented">
              <button type="button" className={groupBy === "day" ? "active" : ""} onClick={() => setGroupBy("day")}>Daily</button>
              <button type="button" className={groupBy === "week" ? "active" : ""} onClick={() => setGroupBy("week")}>Weekly</button>
            </div>
          </div>

          {isLoading ? <p className="analytics-empty">Loading frequency chart…</p> : frequency.length === 0 ? (
            <p className="analytics-empty">No deployment data for this range.</p>
          ) : (
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={frequency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" stackId="deployments" fill="#16a34a" name="Success" />
                  <Bar dataKey="failed" stackId="deployments" fill="#dc2626" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="analytics-two-col">
          <div className="analytics-panel">
            <div className="analytics-panel-head"><h3>By repository</h3></div>
            {sortedByRepo.length === 0 ? (
              <p className="analytics-empty">No repositories in this range.</p>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th><button type="button" onClick={() => toggleRepoSort("repo_full_name")}>Repo</button></th>
                      <th><button type="button" onClick={() => toggleRepoSort("total")}>Total</button></th>
                      <th><button type="button" onClick={() => toggleRepoSort("success_rate")}>Success rate</button></th>
                      <th><button type="button" onClick={() => toggleRepoSort("avg_duration_seconds")}>Avg duration</button></th>
                      <th><button type="button" onClick={() => toggleRepoSort("last_deployment_at")}>Last deploy</button></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByRepo.map((row) => (
                      <tr key={row.repo_full_name}>
                        <td>{row.repo_full_name}</td>
                        <td>{row.total}</td>
                        <td>{row.success_rate}%</td>
                        <td>{formatDuration(row.avg_duration_seconds)}</td>
                        <td title={new Date(row.last_deployment_at).toLocaleString()}>{formatRelative(row.last_deployment_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-head"><h3>By environment</h3></div>
            {byEnvironment.length === 0 ? (
              <p className="analytics-empty">No environments in this range.</p>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Environment</th>
                      <th>Total</th>
                      <th>Success %</th>
                      <th>Avg duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEnvironment.map((row) => (
                      <tr key={row.environment_display_name}>
                        <td>
                          <span className="analytics-env-pill">
                            <span className="analytics-env-dot" style={{ background: row.color_tag }} />
                            {row.environment_display_name}
                          </span>
                        </td>
                        <td>{row.total}</td>
                        <td>{row.success_rate}%</td>
                        <td>{formatDuration(row.avg_duration_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h3>Duration trend</h3>
            <select className="analytics-repo-select" value={repoFilter} onChange={(event) => setRepoFilter(event.target.value)}>
              <option value="">All repos</option>
              {trackedRepos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
          </div>

          {durationTrend.length === 0 ? (
            <p className="analytics-empty">No completed deployments in this range.</p>
          ) : (
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={durationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_seconds" stroke="#0284c7" strokeWidth={2} name="Avg duration" dot={false} />
                  <Line type="monotone" dataKey="p95_seconds" stroke="#ea580c" strokeWidth={2} strokeDasharray="5 5" name="P95 duration" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="analytics-panel mttr-panel">
          <div>
            <p className="mttr-label">mean time to recovery</p>
            <div className="mttr-value">{mttr?.avg_mttr_minutes ?? 0} min</div>
          </div>

          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Environment</th>
                  <th>MTTR (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {(mttr?.by_environment ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2}>No failures in this range.</td>
                  </tr>
                ) : (
                  mttr?.by_environment.map((item) => (
                    <tr key={item.display_name}>
                      <td>{item.display_name}</td>
                      <td>{item.avg_mttr_minutes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
