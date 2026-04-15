import { defineStore } from "pinia";

interface Client {
  id: string;
  name: string;

  npwp?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;

  addressText?: string | null;
  addressMeta?: Record<string, any> | null;

  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export const useClientsStore = defineStore("clients", {
  state: () => ({
    items: [] as Client[],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    loading: false,
  }),

  actions: {
    setClients(data: any) {
      this.items = data.items;
      this.page = data.page;
      this.limit = data.limit;
      this.total = data.total;
      this.totalPages = data.totalPages;
    },

    setLoading(val: boolean) {
      this.loading = val;
    },

    updateClientInList(updated: Client) {
      const index = this.items.findIndex((i) => i.id === updated.id);
      if (index !== -1) {
        this.items[index] = updated;
      }
    },

    removeClient(id: string) {
      this.items = this.items.filter((i) => i.id !== id);
    },

    clear() {
      this.items = [];
    },
  },
});