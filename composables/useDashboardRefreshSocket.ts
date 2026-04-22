import { ref } from "vue";

type RefreshSocketPayload = {
  type?: string;
  message?: string;
};

export const useDashboardRefreshSocket = () => {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const shouldReconnect = ref(true);
  const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  const getSocketUrl = () => {
    if (!import.meta.client) return "";

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/ws/dashboard-refresh`;
  };

  const connect = (
    onRefresh: () => Promise<void> | void,
    onError?: (message: string) => void,
  ) => {
    if (!import.meta.client || socket.value) return;

    const url = getSocketUrl();
    if (!url) return;

    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }

    socket.value = new WebSocket(url);

    socket.value.onopen = () => {
      isConnected.value = true;
    };

    socket.value.onmessage = async (event) => {
      let payload: RefreshSocketPayload = {};
      try {
        payload = JSON.parse(event.data);
      } catch {
        onError?.("WebSocket message tidak valid");
        return;
      }

      if (payload.type === "refresh_dashboard") {
        await onRefresh();
      }
    };

    socket.value.onerror = () => {
      onError?.("WebSocket error");
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      socket.value = null;
      if (!shouldReconnect.value) return;
      reconnectTimer.value = setTimeout(() => {
        connect(onRefresh, onError);
      }, 3000);
    };
  };

  const requestRefresh = () => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) return false;
    socket.value.send(
      JSON.stringify({
        type: "refresh_request",
        source: "dashboard_home",
      }),
    );
    return true;
  };

  const disconnect = () => {
    shouldReconnect.value = false;
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }
    if (!socket.value) return;
    socket.value.close();
    socket.value = null;
    isConnected.value = false;
  };

  return {
    isConnected,
    connect,
    requestRefresh,
    disconnect,
  };
};
