import { defineStore } from "pinia"

export type ToastType = "success" | "danger" | "warning" | "info"

const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 3000,
  info: 3500,
  warning: 5000,
  danger: 6000,
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    message: "",
    type: "success" as ToastType,
    visible: false,
  }),

  actions: {
    show(message: string, type: ToastType = "success") {
      this.message = message
      this.type = type
      this.visible = true

      // A new toast restarts the timer so it is not cut short by the previous one.
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        this.visible = false
        hideTimer = null
      }, TOAST_DURATION_MS[type])
    },

    hide() {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
      this.visible = false
    }
  }
})