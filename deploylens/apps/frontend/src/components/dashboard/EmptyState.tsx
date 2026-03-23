import { Rocket, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  hasFilters: boolean;
  onClearFilters: () => void;
};

export default function EmptyState({ hasFilters, onClearFilters }: Props) {
  const navigate = useNavigate();

  if (hasFilters) {
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
