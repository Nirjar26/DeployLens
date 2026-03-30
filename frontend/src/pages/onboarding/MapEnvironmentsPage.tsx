import EnvironmentMapper from "../../components/onboarding/EnvironmentMapper";
import { useAwsStore } from "../../store/awsStore";

export default function MapEnvironmentsPage() {
  const fetchApplications = useAwsStore((state) => state.fetchApplications);
  const fetchEnvironments = useAwsStore((state) => state.fetchEnvironments);

  async function handleLoad() {
    await Promise.all([fetchApplications(), fetchEnvironments()]);
  }

  return (
    <section className="onboarding-step-page onboarding-environments-page">
      <header className="onboarding-step-header">
        <span className="onboarding-step-badge">Step 4 of 4</span>
        <h1>Map deployment environments</h1>
        <p>Attach each repository to a CodeDeploy app and deployment group</p>
      </header>

      <div className="onboarding-step-divider" />

      <EnvironmentMapper onLoad={handleLoad} />
    </section>
  );
}
