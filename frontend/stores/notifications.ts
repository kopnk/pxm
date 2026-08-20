import { defineStore } from "pinia"

export type ToastType = "success" | "danger" | "warning" | "info"

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

      setTimeout(() => {
        this.visible = false
      }, 3000)
    },

    hide() {
      this.visible = false
    }
  }
})