import { defineStore } from "pinia";

export type DcnFlow = "in" | "out";

export interface DcnItem {
  id: string;
  letterDate: string;
  number: string;
  type?: string | null;
  toAddress?: string | null;
  fromAddress?: string | null;
  subject?: string | null;
  flow: DcnFlow;
  createdUser?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useDcnStore = defineStore("dcn", {
  state: () => ({
    items: [] as DcnItem[],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    loading: false,
  }),

  actions: {
    setDcnList(data: {
      items: DcnItem[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }) {
      this.items = data.items;
      this.page = data.page;
      this.limit = data.limit;
      this.total = data.total;
      this.totalPages = data.totalPages;
    },

    setLoading(value: boolean) {
      this.loading = value;
    },

    updateItemInList(updated: DcnItem) {
      const index = this.items.findIndex((item) => item.id === updated.id);
      if (index !== -1) this.items[index] = updated;
    },

    removeItem(id: string) {
      this.items = this.items.filter((item) => item.id !== id);
    },

    clear() {
      this.items = [];
    },
  },
});
