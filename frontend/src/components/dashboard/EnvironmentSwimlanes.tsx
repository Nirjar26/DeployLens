import { CSSProperties } from "react";
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

  const emptyStateStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "48px 32px",
    textAlign: "center",
  };

  const emptyStateHeadingStyle: CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  };

  const emptyStateTextStyle: CSSProperties = {
    fontSize: "14px",
    color: "var(--text-muted)",
    margin: 0,
  };

  const buttonStyle: CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "var(--accent)",
    color: "var(--text-on-accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  const swimlanesStyle: CSSProperties = {
    display: "flex",
    gap: "16px",
    overflowX: "auto",
    paddingBottom: "8px",
  };

  if (environments.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <h3 style={emptyStateHeadingStyle}>No environments configured</h3>
        <p style={emptyStateTextStyle}>Set them up in onboarding or settings.</p>
        <button type="button" style={buttonStyle} onClick={() => navigate("/settings")}>
          Go to settings
        </button>
      </div>
    );
  }

  return (
    <div style={swimlanesStyle}>
      {environments.map((entry) => (
        <EnvironmentColumn key={entry.environment.id} item={entry} onOpen={onOpen} onViewAll={onSelectEnvironment} />
      ))}
    </div>
  );
}
