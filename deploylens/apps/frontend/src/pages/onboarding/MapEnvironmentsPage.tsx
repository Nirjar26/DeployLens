import EnvironmentMapper from "../../components/onboarding/EnvironmentMapper";
import { useAwsStore } from "../../store/awsStore";

export default function MapEnvironmentsPage() {
  const fetchApplications = useAwsStore((state) => state.fetchApplications);
  const fetchEnvironments = useAwsStore((state) => state.fetchEnvironments);

  async function handleLoad() {
    await Promise.all([fetchApplications(), fetchEnvironments()]);
  }

  return <EnvironmentMapper onLoad={handleLoad} />;
}
