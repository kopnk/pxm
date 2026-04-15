// stores/projects.ts
import { defineStore } from "pinia";

export interface Project {
  id: string;

  contractNumber: string | null;
  prScNumber: string;
  poNumber: string;
  poDate: string;
  deliveryDate: string | null;
  komDate: string | null;

  projectName: string;

  subTotal: number | null;
  discount: number | null;
  netPrice: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  grandTotal: number | null;
  hpp?: number | null;
  dpp?: number | null;
  mrg?: number | null;

  status: string;
  pm: string | null;

  clientId?: string | null;

  createdUser: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const useProjectsStore = defineStore("projects", {
  state: () => ({
    items: [] as Project[],
    meta: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    } as ProjectsMeta,
    loading: false,
    filters: {
      search: "",
      status: "",
    },
  }),

  actions: {
    setProjects(items: Project[], meta: ProjectsMeta) {
      this.items = [...items];
      this.meta = meta;
    },

    setLoading(val: boolean) {
      this.loading = val;
    },

    setFilters(filters: Partial<{ search: string; status: string }>) {
      this.filters = {
        ...this.filters,
        ...filters,
      };
    },

    // simple setter only: caller/composable should decide to refetch or update
    setItems(items: Project[]) {
      this.items = [...items];
    },

    clear() {
      this.items = [];
      this.meta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      };
      this.filters.search = "";
      this.filters.status = "";
    },
  },
});
