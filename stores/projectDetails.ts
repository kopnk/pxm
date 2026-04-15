// stores/projectDetails.ts
import { defineStore } from "pinia";

/* ================= TYPES ================= */
export interface ProjectDetailItem {
  id: string;

  projectId: string | null;
  cityKabId: string | null;

  lineNumber: number | null;

  systemkey: string | null;
  neId: string | null;

  materialId: string | null;
  materialName: string | null;

  siteId: string | null;
  siteName: string | null;

  picArea: string | null;

  quantity: number | null;
  uom: string | null;

  unitPrice: number | null;
  totalPrice: number | null;
  taxOut: number | null;

  status: string | null;

  // 🔥 ADDED (match DB & endpoint)
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;

  createdAt: string | null;
  updatedAt: string | null;

  projectName: string | null;
  poNumber: string | null;
  cityKabName: string | null;
  subRegionName: string | null;
  regionName: string | null;
  subRegionId?: string | null;
  regionId?: string | null;

  createdUser: string | null;
  createdBy: string | null;
}

export interface ProjectDetailsState {
  items: ProjectDetailItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
}

/* ================= STORE ================= */
export const useProjectDetailsStore = defineStore("projectDetails", {
  state: (): ProjectDetailsState => ({
    items: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    loading: false,
  }),

  actions: {
    /* ===== SETTERS ===== */

    setProjectDetails(payload: {
      items: ProjectDetailItem[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }) {
      this.items = [...payload.items]; // 🔥 force reactivity
      this.page = payload.page;
      this.limit = payload.limit;
      this.total = payload.total;
      this.totalPages = payload.totalPages;
    },

    setItems(items: ProjectDetailItem[]) {
      this.items = [...items];
    },

    setPage(page: number) {
      this.page = page;
    },

    setLimit(limit: number) {
      this.limit = limit;
    },

    setTotal(total: number) {
      this.total = total;
    },

    setTotalPages(totalPages: number) {
      this.totalPages = totalPages;
    },

    setLoading(value: boolean) {
      this.loading = value;
    },

    /* ===== RESET ===== */

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
