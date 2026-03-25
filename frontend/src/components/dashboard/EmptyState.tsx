import { Rocket, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FolderGit2, Github } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { DeploymentFilters } from "../../store/deploymentStore";

type Props = {
  hasFilters: boolean;
  filters: DeploymentFilters;
  total: number;
  onClearFilters: () => void;
};

export default function EmptyState({ hasFilters, filters, total, onClearFilters }: Props) {
  const navigate = useNavigate();
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const trackedRepos = useAuthStore((state) => state.trackedRepos);

  if (hasFilters) {
    let title = "No deployments match your filters";
    let subtitle = "Try adjusting your filters or clearing them.";

    if (filters.triggered_by) {
      title = "You have not triggered any deployments yet";
      subtitle = "Deployments you trigger will appear here";
    } else if (filters.status) {
      title = `No ${filters.status.replace("_", " ")} deployments`;
      subtitle = "Try a different status or clear the filter";
    } else if (filters.repo) {
      title = `No deployments for ${filters.repo}`;
      subtitle = "This repo has not been deployed yet or try a different time range";
    } else if (filters.from || filters.to) {
      title = "No deployments in this date range";
      subtitle = "Try expanding the date range";
    }

    return (
      <div className="empty-state">
        <Search size={30} />
        <h3>{title}</h3>
        <p>{subtitle}</p>
        <button className="auth-btn auth-btn-secondary" type="button" onClick={onClearFilters}>Clear filters</button>
      </div>
    );
  }

  if (!githubConnected) {
    return (
      <div className="empty-state">
        <Github size={30} />
        <h3>Connect GitHub to start</h3>
        <p>DeployLens needs access to your repositories.</p>
        <button className="auth-btn auth-btn-primary" type="button" onClick={() => navigate("/settings/integrations")}>Connect GitHub</button>
      </div>
    );
  }

  if (trackedRepos.length === 0) {
    return (
      <div className="empty-state">
        <FolderGit2 size={30} />
        <h3>No repositories tracked</h3>
        <p>Add repositories to monitor deployments.</p>
        <button className="auth-btn auth-btn-primary" type="button" onClick={() => navigate("/settings/repositories")}>Add repositories</button>
      </div>
    );
  }

  if (total > 0) {
    return (
      <div className="empty-state">
        <Search size={30} />
        <h3>No deployments match your filters</h3>
        <p>Try adjusting your filters or clearing them.</p>
        <button className="auth-btn auth-btn-secondary" type="button" onClick={onClearFilters}>Clear filters</button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <Rocket size={30} />
      <h3>No deployments yet</h3>
      <p>Once you trigger a GitHub Actions workflow in a tracked repo, deployments will appear here.</p>
      <button className="auth-btn auth-btn-primary" type="button" onClick={() => navigate("/onboarding/github")}>Go to onboarding</button>
    </div>
  );
}
