import { useEffect } from "react";
import { useDeploymentStore } from "../store/deploymentStore";

export function useDeploymentDetail(id: string | null) {
  const fetchDeploymentDetail = useDeploymentStore((state) => state.fetchDeploymentDetail);

  useEffect(() => {
    if (!id) return;
    void fetchDeploymentDetail(id);
  }, [fetchDeploymentDetail, id]);
}
