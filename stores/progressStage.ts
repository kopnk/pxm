import { defineStore } from "pinia";

/* ================= TYPES ================= */
export interface ProgressStage {
  id: string;
  code: string;
  name: string;
  stageType: "admin" | "field" | "document";
  sequence: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdUser: string;
}

interface ProgressStageState {
  items: ProgressStage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
}

/* ================= STORE ================= */
export const useProgressStageStore = defineStore("progressStage", {
  state: (): ProgressStageState => ({
    items: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    loading: false,
  }),

  actions: {
    setItems(items: ProgressStage[]) {
      this.items = items;
    },

    setPagination(payload: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }) {
      this.page = payload.page;
      this.limit = payload.limit;
      this.total = payload.total;
      this.totalPages = payload.totalPages;
    },

    setLoading(value: boolean) {
      this.loading = value;
    },

    reset() {
      this.items = [];
      this.page = 1;
      this.limit = 10;
      this.total = 0;
      this.totalPages = 0;
      this.loading = false;
    },
  },
});