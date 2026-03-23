import {
  emitDeploymentCreated,
  emitDeploymentUpdated,
} from "../modules/websocket/socket.service";

export async function emitDeploymentUpdate(
  deploymentId: string,
  isNew: boolean = false,
): Promise<void> {
  if (isNew) {
    await emitDeploymentCreated(deploymentId);
    return;
  }

  await emitDeploymentUpdated(deploymentId);
}
