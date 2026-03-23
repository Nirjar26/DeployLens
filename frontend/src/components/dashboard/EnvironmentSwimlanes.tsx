import { useNavigate } from "react-router-dom";
import { EnvironmentLatest } from "../../store/deploymentStore";
import EnvironmentColumn from "./EnvironmentColumn";

type Props = {
  environments: EnvironmentLatest[];
  onOpen: (id: string) => void;
  onSelectEnvironment: (environmentName: string) => void;
};

export default function EnvironmentSwimlanes({ environments, onOpen, onSelectEnvironment }: Props) {
  const navigate = useNavigate();

  if (environments.length === 0) {
    return (
      <div className="dl-env-empty-state">
        <h3>No environments configured</h3>
        <p>Set them up in onboarding or settings.</p>
        <button type="button" className="dl-btn dl-btn-primary" onClick={() => navigate("/settings")}>
          Go to settings
        </button>
      </div>
    );
  }

  return (
    <div className="dl-swimlanes">
      {environments.map((entry) => (
        <EnvironmentColumn key={entry.environment.id} item={entry} onOpen={onOpen} onViewAll={onSelectEnvironment} />
      ))}
    </div>
  );
}
