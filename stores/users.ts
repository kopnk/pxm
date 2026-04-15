// stores/users.ts
import { defineStore } from "pinia";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  region?: string;
  area?: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const useUsersStore = defineStore("users", {
  state: () => ({
    items: [] as User[],
    meta: null as UsersMeta | null,
    loading: false,
  }),

  actions: {
    setLoading(value: boolean) {
      this.loading = value;
    },

    setUsers(items: User[], meta: UsersMeta) {
      this.items = [...items];
      this.meta = { ...meta };
    },

    removeUser(id: string) {
      this.items = this.items.filter((u) => u.id !== id);
      if (this.meta) {
        this.meta = {
          ...this.meta,
          total: Math.max(0, this.meta.total - 1),
        };
      }
    },

    clear() {
      this.items = [];
      this.meta = null;
    },
  },
});
