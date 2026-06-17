import {
  broadcastDashboardRefresh,
  registerDashboardPeer,
  unregisterDashboardPeer,
} from "~/server/utils/dashboardRefreshHub";
import { checkRateLimit } from "~/server/utils/rateLimit";

export default defineWebSocketHandler({
  open(peer) {
    registerDashboardPeer(peer);
    peer.send(
      JSON.stringify({
        type: "socket_connected",
        message: "Dashboard refresh socket connected",
      }),
    );
  },
  message(peer, message) {
    const text = message.text();
    if (!text) return;

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(text);
    } catch {
      peer.send(
        JSON.stringify({
          type: "socket_error",
          message: "Invalid websocket payload",
        }),
      );
      return;
    }

    if (payload?.type !== "refresh_request") return;
    const limit = checkRateLimit("ws-dashboard-refresh", {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!limit.allowed) {
      peer.send(
        JSON.stringify({
          type: "socket_error",
          message: `Too many refresh requests. Try again in ${limit.retryAfterSec}s`,
        }),
      );
      return;
    }

    broadcastDashboardRefresh(payload.source ?? "dashboard_socket");
  },
  close(peer) {
    unregisterDashboardPeer(peer);
  },
});
