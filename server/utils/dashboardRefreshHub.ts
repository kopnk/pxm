type SocketPeer = {
  send: (data: string) => void;
};

const dashboardPeers = new Set<SocketPeer>();

export function registerDashboardPeer(peer: SocketPeer) {
  dashboardPeers.add(peer);
}

export function unregisterDashboardPeer(peer: SocketPeer) {
  dashboardPeers.delete(peer);
}

export function broadcastDashboardRefresh(source = "unknown") {
  const payload = JSON.stringify({
    type: "refresh_dashboard",
    source,
  });

  for (const peer of dashboardPeers) {
    peer.send(payload);
  }
}
