type DeploymentUpdatedPayload = {
  deploymentId: string;
  unified_status: string;
};

export function emitDeploymentUpdated(payload: DeploymentUpdatedPayload) {
  // Module 6 will replace this stub with a real WebSocket broadcaster.
  console.log("deployment:updated", payload);
}
