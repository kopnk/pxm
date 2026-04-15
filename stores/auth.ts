import { defineStore } from "pinia";
import { apiFetch } from "~/utils/apiFetch";

/** Session user from /api/auth/me (subset used across pages). */
export type AuthSessionUser = {
  id: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthSessionUser | null,
    initialized: false,
  }),

  actions: {
    async initAuth() {
      if (this.initialized) return;

      try {
        const res = await apiFetch<{ data: { user: AuthSessionUser } }>(
          "/api/auth/me",
        );
        this.user = res.data.user;
      } catch {
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },

    async logout() {
      try {
        await apiFetch("/api/auth/logout", {
          method: "POST",
        });
      } catch {
        // ignore error
      } finally {
        this.user = null;
        this.initialized = false;
      }
    },

    setUser(user: AuthSessionUser) {
      this.user = user;
      this.initialized = true;
    },

    clearUser() {
      this.user = null;
      this.initialized = true;
    },
  },
});
