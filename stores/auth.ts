import { defineStore } from 'pinia'

// stores/auth.ts
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    initialized: false
  }),

  actions: {
    async initAuth() {
      if (this.initialized) return

      try {
        const res = await $fetch('/api/auth/me', {
          credentials: 'include'
        })

        this.user = res.data.user
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    },

    async logout() {
      try {
        await $fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        })
      } catch {
        // ignore error
      } finally {
        this.user = null
        this.initialized = false
      }
    },

    setUser(user: any) {
      this.user = user
      this.initialized = true
    },

    clearUser() {
      this.user = null
      this.initialized = true
    }
  }
})
