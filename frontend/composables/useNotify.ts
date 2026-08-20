import { useNotificationStore } from "@/stores/notifications"

export const useNotify = () => {
  const store = useNotificationStore()

  return {
    success: (msg: string) => store.show(msg, "success"),
    error: (msg: string) => store.show(msg, "danger"),
    warning: (msg: string) => store.show(msg, "warning"),
    info: (msg: string) => store.show(msg, "info"),
  }
}