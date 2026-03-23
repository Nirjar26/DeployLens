import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoCard from "../../components/onboarding/RepoCard";
import RepoSearch from "../../components/onboarding/RepoSearch";
import { GithubRepo, github } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function SelectReposPage() {
  const navigate = useNavigate();
  const trackedRepos = useAuthStore((state) => state.trackedRepos);
  const fetchTrackedRepos = useAuthStore((state) => state.fetchTrackedRepos);
  const setTrackedRepos = useAuthStore((state) => state.setTrackedRepos);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [repoList, trackedList] = await Promise.all([github.getRepos(), github.getTrackedRepos()]);
        setRepos(repoList);
        setTrackedRepos(trackedList);

        const preselected = new Set<number>();
        for (const tracked of trackedList) {
          preselected.add(tracked.github_repo_id);
        }
        setSelected(preselected);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load repositories");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const trackedIds = useMemo(() => new Set(trackedRepos.map((repo) => repo.github_repo_id)), [trackedRepos]);

  const visibleRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return repos;

    return repos.filter((repo) => {
      const repoName = `${repo.owner}/${repo.name}`.toLowerCase();
      return repoName.includes(q);
    });
  }, [repos, search]);

  function toggleRepo(repoId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const selectedRepos = repos
        .filter((repo) => selected.has(repo.github_repo_id))
        .map((repo) => ({
          github_repo_id: repo.github_repo_id,
          owner: repo.owner,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          default_branch: repo.default_branch,
        }));

      await github.trackRepos(selectedRepos);
      await fetchTrackedRepos();
      navigate("/onboarding/aws");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save repos, try again");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="repos-page">
      <header className="repos-header">
        <h1>Select repos to track</h1>
        <p>DeployLens will monitor Actions runs for selected repos</p>
      </header>

      <RepoSearch
        value={search}
        onChange={setSearch}
        visibleCount={visibleRepos.length}
        totalCount={repos.length}
      />

      {isLoading ? (
        <div className="repo-skeleton-list">
          <div className="repo-skeleton" />
          <div className="repo-skeleton" />
          <div className="repo-skeleton" />
        </div>
      ) : (
        <div className="repo-list">
          {visibleRepos.map((repo) => (
            <RepoCard
              key={repo.github_repo_id}
              repo={repo}
              checked={selected.has(repo.github_repo_id)}
              tracked={trackedIds.has(repo.github_repo_id)}
              onToggle={toggleRepo}
            />
          ))}
        </div>
      )}

      <div className="repos-sticky-bar">
        <span>{selected.size} repos selected</span>
        <button
          type="button"
          className="auth-btn auth-btn-primary"
          disabled={selected.size === 0 || isSaving}
          onClick={handleSave}
        >
          {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
          {isSaving ? "Saving..." : "Continue"}
        </button>
      </div>

      {error ? <div className="repo-toast-error">{error}</div> : null}
    </section>
  );
}
