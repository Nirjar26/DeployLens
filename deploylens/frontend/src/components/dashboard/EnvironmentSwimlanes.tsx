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
      <div className="empty-state">
        <h3>No environments configured</h3>
        <p>No environments configured. Set them up in onboarding.</p>
        <button type="button" className="auth-btn auth-btn-primary" onClick={() => navigate("/settings")}>Go to settings</button>
      </div>
    );
  }

  return (
    <div className="swimlanes-wrap">
      {environments.map((entry) => (
        <EnvironmentColumn key={entry.environment.id} item={entry} onOpen={onOpen} onViewAll={onSelectEnvironment} />
      ))}
    </div>
  );
}
