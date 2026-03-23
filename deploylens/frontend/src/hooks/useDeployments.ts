import { useEffect } from "react";
import { useDeploymentStore } from "../store/deploymentStore";

export function useDeployments() {
  const fetchDeployments = useDeploymentStore((state) => state.fetchDeployments);
  const fetchStats = useDeploymentStore((state) => state.fetchStats);

  useEffect(() => {
    void Promise.all([fetchDeployments(), fetchStats()]);
  }, [fetchDeployments, fetchStats]);
}
