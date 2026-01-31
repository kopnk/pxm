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
    setUsers(items: User[], meta: UsersMeta) {
      this.items = items;
      this.meta = meta;
    },

    clear() {
      this.items = [];
      this.meta = null;
    },

    async fetchUsers(params?: { page?: number; limit?: number }) {
      this.loading = true;

      const { data, error } = await useFetch("/api/users", {
        query: params,
      });

      if (!error.value && data.value) {
        this.setUsers(
          data.value.data.items,
          data.value.data.meta
        );
      }

      this.loading = false;
    },

async deleteUser(id: string) {
  await $fetch(`/api/users/${id}`, {
    method: "DELETE",
  });

  // 🔥 WAJIB: sinkronkan state
  this.items = this.items.filter(u => u.id !== id);

  if (this.meta) {
    this.meta.total -= 1;
  }
},
  },
});
