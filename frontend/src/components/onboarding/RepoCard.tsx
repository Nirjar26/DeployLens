import { GithubRepo } from "../../lib/api";

type RepoCardProps = {
  repo: GithubRepo;
  checked: boolean;
  tracked: boolean;
  onToggle: (id: number) => void;
};

const LANGUAGE_COLOR_MAP: Record<string, string> = {
  typescript: "var(--repo-lang-typescript)",
  python: "var(--repo-lang-python)",
  javascript: "var(--repo-lang-javascript)",
  css: "var(--repo-lang-css)",
};

function relativeDays(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function RepoCard({ repo, checked, tracked, onToggle }: RepoCardProps) {
  const language = repo.language?.trim() || "Unknown";
  const languageColor = LANGUAGE_COLOR_MAP[language.toLowerCase()] ?? "var(--repo-lang-unknown)";

  return (
    <label className={`repo-card ${checked ? "repo-card-checked" : ""}`}>
      <input
        type="checkbox"
        className="repo-card-native-checkbox"
        checked={checked}
        onChange={() => onToggle(repo.github_repo_id)}
      />
      <span className={`repo-card-checkbox ${checked ? "repo-card-checkbox-checked" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path d="M3.6 8.2 6.6 11l5.8-6.1" />
        </svg>
      </span>
      <div className="repo-main">
        <div className="repo-title-row">
          <span className="repo-name truncate" title={`${repo.owner}/${repo.name}`}>{repo.owner}/{repo.name}</span>
          {repo.private ? <span className="repo-private">private</span> : null}
          {tracked ? <span className="repo-tracking">tracking</span> : null}
        </div>
        <div className="repo-meta-row">
          <span className="repo-language-dot" style={{ backgroundColor: languageColor }} />
          <span>{language}</span>
          <span>·</span>
          <span>Updated {relativeDays(repo.updated_at)}</span>
        </div>
      </div>
      <span className="repo-branch-pill">{repo.default_branch}</span>
    </label>
  );
}
