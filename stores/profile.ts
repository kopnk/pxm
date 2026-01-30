// stores/profile.ts
import { defineStore } from 'pinia'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null as any,
    loaded: false
  }),

  actions: {
    async fetchProfile(force = false) {
      if (this.loaded && !force) return
      const res = await $fetch('/api/profile', {
        credentials: 'include'
      })
      this.profile = res.data
      this.loaded = true
    },

    clear() {
      this.profile = null
      this.loaded = false
    }
  }
})
