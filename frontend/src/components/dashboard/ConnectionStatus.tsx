import { reconnectSocket } from "../../lib/socket";
import { useAuthStore } from "../../store/authStore";
import { useSocketStatus } from "../../hooks/useSocketStatus";

export default function ConnectionStatus() {
  const status = useSocketStatus();
  const accessToken = useAuthStore((state) => state.accessToken);

  const isClickable = status === "disconnected" && Boolean(accessToken);

  const handleReconnect = () => {
    if (accessToken) {
      reconnectSocket(accessToken);
    }
  };

  return (
    <button
      type="button"
      className={`dl-connection-status dl-connection-status-${status}`}
      onClick={isClickable ? handleReconnect : undefined}
      disabled={!isClickable}
      aria-live="polite"
      title={isClickable ? "Reconnect live updates" : undefined}
    >
      <span className="dl-connection-dot" aria-hidden="true" />
      <span className="dl-connection-label">
        {status === "connected" ? "Live" : status === "connecting" ? "Connecting..." : "Offline — refresh to reconnect"}
      </span>
    </button>
  );
}
