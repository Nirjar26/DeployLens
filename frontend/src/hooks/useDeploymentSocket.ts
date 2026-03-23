import { useEffect } from "react";
import { connectSocket, getRawSocket, getSocket } from "../lib/socket";
import type { DeploymentCreatedEvent, DeploymentUpdatedEvent } from "../types/socket.types";
import { useAuthStore } from "../store/authStore";
import { useDeploymentStore } from "../store/deploymentStore";

export function useDeploymentSocket(): void {
  const updateDeployment = useDeploymentStore((state) => state.updateDeployment);
  const addDeployment = useDeploymentStore((state) => state.addDeployment);
  const triggerStatsRefresh = useDeploymentStore((state) => state.triggerStatsRefresh);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    connectSocket(accessToken);

    const onDeploymentUpdated = (data: DeploymentUpdatedEvent) => {
      updateDeployment(data.deploymentId, {
        unified_status: data.unified_status as "pending" | "running" | "success" | "failed" | "rolled_back",
        github_status: data.github_status,
        codedeploy_status: data.codedeploy_status,
        finished_at: data.finished_at,
        duration_seconds: data.duration_seconds,
        started_at: data.started_at,
      });
    };

    const onDeploymentCreated = (data: DeploymentCreatedEvent) => {
      addDeployment({
        id: data.deploymentId,
        github_run_id: null,
        codedeploy_id: null,
        unified_status: data.unified_status as "pending" | "running" | "success" | "failed" | "rolled_back",
        commit_sha: data.commit_sha ?? "unknown",
        commit_sha_short: data.commit_sha_short ?? "unknown",
        commit_message: data.commit_message,
        branch: data.branch ?? "unknown",
        triggered_by: data.triggered_by,
        github_status: null,
        github_run_url: null,
        codedeploy_status: null,
        is_rollback: false,
        started_at: null,
        finished_at: null,
        duration_seconds: null,
        created_at: data.created_at,
        repository: data.repository,
        environment: data.environment,
      });
    };

    const onStatsRefresh = () => {
      triggerStatsRefresh();
    };

    function registerListeners() {
      const socket = getSocket();
      if (!socket) {
        return;
      }

      socket.off("deployment:updated", onDeploymentUpdated);
      socket.off("deployment:created", onDeploymentCreated);
      socket.off("stats:refresh", onStatsRefresh);

      socket.on("deployment:updated", onDeploymentUpdated);
      socket.on("deployment:created", onDeploymentCreated);
      socket.on("stats:refresh", onStatsRefresh);
    }

    const onReconnect = () => {
      registerListeners();
    };

    registerListeners();

    const raw = getRawSocket();
    raw?.on("connect", onReconnect);

    return () => {
      raw?.off("connect", onReconnect);

      const socket = getSocket();
      socket?.off("deployment:updated", onDeploymentUpdated);
      socket?.off("deployment:created", onDeploymentCreated);
      socket?.off("stats:refresh", onStatsRefresh);
    };
  }, [isAuthenticated, accessToken, updateDeployment, addDeployment, triggerStatsRefresh]);
}
