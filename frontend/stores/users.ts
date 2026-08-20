// stores/users.ts
import { defineStore } from "pinia";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

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
  mustChangePassword?: boolean;
  createdUser?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
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
    meta: {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      total: 0,
      totalPages: 1,
    } as UsersMeta,
    loading: false,
    filters: {
      search: "",
      role: "",
      isActive: "",
    },
  }),

  actions: {
    setLoading(value: boolean) {
      this.loading = value;
    },

    setFilters(filters: Partial<typeof this.filters>) {
      this.filters = { ...this.filters, ...filters };
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
      this.meta = {
        page: 1,
        limit: DEFAULT_PAGE_LIMIT,
        total: 0,
        totalPages: 1,
      };
    },
  },
});
