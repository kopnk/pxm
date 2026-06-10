import { defineStore } from "pinia";
import { apiFetch } from "~/utils/apiFetch";
import {
  type RlsAction,
  type RlsMatrix,
  type RlsResource,
  defaultMatrixForRole,
  hasRlsPermission,
  normalizeRlsMatrix,
} from "~/lib/rls";

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
  permissions?: RlsMatrix;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthSessionUser | null,
    permissions: null as RlsMatrix | null,
    initialized: false,
  }),

  getters: {
    canAccess:
      (state) =>
      (resource: RlsResource, action: RlsAction): boolean => {
        const role = state.user?.role;
        const matrix =
          state.permissions ??
          state.user?.permissions ??
          (role ? defaultMatrixForRole(role) : null);
        return hasRlsPermission(matrix, resource, action, role);
      },
  },

  actions: {
    async initAuth() {
      if (this.initialized) return;
      await this.refreshSession();
      this.initialized = true;
    },

    /** Muat ulang user + permission dari server (tanpa logout). */
    async refreshSession() {
      try {
        const res = await apiFetch<{
          data: { user: AuthSessionUser; permissions?: RlsMatrix };
        }>("/api/auth/me");
        this.applySession(
          res.data.user,
          res.data.permissions ?? res.data.user.permissions,
        );
      } catch {
        this.user = null;
        this.permissions = null;
      }
    },

    applySession(user: AuthSessionUser, permissions?: RlsMatrix) {
      const role = user.role ?? "staff";
      const matrix = normalizeRlsMatrix(
        permissions ?? user.permissions,
        role,
      );
      this.user = { ...user, permissions: matrix };
      this.permissions = matrix;
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
        this.permissions = null;
        this.initialized = false;
      }
    },

    setUser(user: AuthSessionUser, permissions?: RlsMatrix) {
      this.applySession(user, permissions ?? user.permissions);
      this.initialized = true;
    },

    clearUser() {
      this.user = null;
      this.permissions = null;
      this.initialized = true;
    },
  },
});
