// stores/projectProgress.ts
import { defineStore } from "pinia";

/* ================= TYPES ================= */

export type ProjectProgressStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "delayed"
  | "cancelled";

export interface ProjectProgressStage {
  plan_submit_date?: string | null;
  actual_approve_date?: string | null;
  status?: ProjectProgressStatus | null;
}

export type ProjectProgressStageData = Record<
  string,
  ProjectProgressStage
>;

export interface ProjectProgressItem {
  id: string;

  projectId: string;
  projectDetailId: string;

  projectName?: string | null;
  poNumber?: string | null;
  siteName?: string | null;
  siteId?: string | null;
  materialName?: string | null;
  systemKey?: string | null;
  neId?: string | null;

  stageData: ProjectProgressStageData;

  /** Dari project_details */
  remarksProjectsDetails?: string | null;
  remarksDelay?: string | null;
  remarksCancel?: string | null;
  /** Sama dengan status baris di project-details (active | delay | closed | cancelled) */
  detailStatus?: string | null;

  createdUser?: string;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectProgressState {
  items: ProjectProgressItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stageCounts: Record<string, { plan: number; actual: number }>;
  loading: boolean;
}

/* ================= STORE ================= */

export const useProjectProgressStore = defineStore("projectProgress", {
  state: (): ProjectProgressState => ({
    items: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    stageCounts: {},
    loading: false,
  }),

  actions: {

    setProjectProgress(payload: {
      items: ProjectProgressItem[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      stageCounts?: Record<string, { plan: number; actual: number }>;
    }) {
      this.items = [...payload.items];
      this.page = payload.page;
      this.limit = payload.limit;
      this.total = payload.total;
      this.totalPages = payload.totalPages;
      this.stageCounts = payload.stageCounts ?? {};
    },

    setItems(items: ProjectProgressItem[]) {
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

    reset() {
      this.items = [];
      this.page = 1;
      this.limit = 10;
      this.total = 0;
      this.totalPages = 0;
      this.stageCounts = {};
      this.loading = false;
    },
  },
});