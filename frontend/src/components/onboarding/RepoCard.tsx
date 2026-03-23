import { GithubRepo, TrackedRepo } from "../../lib/api";

type RepoCardProps = {
  repo: GithubRepo;
  checked: boolean;
  tracked: boolean;
  onToggle: (id: number) => void;
};

function relativeDays(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function RepoCard({ repo, checked, tracked, onToggle }: RepoCardProps) {
  return (
    <label className={`repo-card ${checked ? "repo-card-checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(repo.github_repo_id)} />
      <div className="repo-main">
        <div className="repo-title-row">
          <span className="repo-name">{repo.owner}/{repo.name}</span>
          {repo.private ? <span className="repo-private">private</span> : null}
          {tracked ? <span className="repo-tracking">tracking</span> : null}
        </div>
        <div className="repo-meta-row">
          <span className="repo-language-dot" />
          <span>{repo.language ?? "Unknown"}</span>
          <span>Updated {relativeDays(repo.updated_at)}</span>
        </div>
      </div>
      <span className="repo-branch-pill">{repo.default_branch}</span>
    </label>
  );
}
