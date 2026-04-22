import {
  broadcastDashboardRefresh,
  registerDashboardPeer,
  unregisterDashboardPeer,
} from "~/server/utils/dashboardRefreshHub";

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
    broadcastDashboardRefresh(payload.source ?? "dashboard_socket");
  },
  close(peer) {
    unregisterDashboardPeer(peer);
  },
});
