// stores/profile.ts
import { defineStore } from "pinia";

export const useProfileStore = defineStore("profile", {
  state: () => ({
    profile: null as any,
    loaded: false,
  }),

  actions: {
    /**
     * Fetch profile dari API
     * - dipanggil di banyak page
     * - cache via loaded flag
     */
    async fetchProfile(force = false) {
      if (this.loaded && !force) return;

      const { data, error } = await useFetch("/api/profile", {
        credentials: "include",
      });

      if (error.value) {
        // session expired / unauthorized / dll
        this.profile = null;
        this.loaded = false;
        throw error.value;
      }

      if (data.value?.success) {
        this.profile = data.value.data;
        this.loaded = true;
      } else {
        // fallback defensive
        this.profile = null;
        this.loaded = false;
      }
    },

    /**
     * Apply partial update ke state
     * ❗ TANPA call API
     * dipakai setelah PUT /api/profile sukses
     */
    applyProfileUpdate(payload: Record<string, any>) {
      if (!this.profile) return;

      this.profile = {
        ...this.profile,
        ...payload,
      };
    },

    /**
     * Clear profile (logout)
     */
    clear() {
      this.profile = null;
      this.loaded = false;
    },
  },
});
