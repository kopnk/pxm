// stores/projectProgress.ts
import { defineStore } from "pinia";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

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
  createdBy?: string | null;
  updatedBy?: string | null;

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
  filters: {
    search: string;
    stage: string;
    stageDateType: "" | "planned" | "actual";
    status: string;
  };
}

/* ================= STORE ================= */

export const useProjectProgressStore = defineStore("projectProgress", {
  state: (): ProjectProgressState => ({
    items: [],
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    total: 0,
    totalPages: 0,
    stageCounts: {},
    loading: false,
    filters: {
      search: "",
      stage: "",
      stageDateType: "",
      status: "",
    },
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

    setFilters(
      filters: Partial<{
        search: string;
        stage: string;
        stageDateType: "" | "planned" | "actual";
        status: string;
      }>,
    ) {
      this.filters = { ...this.filters, ...filters };
    },

    reset() {
      this.items = [];
      this.page = 1;
      this.limit = DEFAULT_PAGE_LIMIT;
      this.total = 0;
      this.totalPages = 0;
      this.stageCounts = {};
      this.loading = false;
    },
  },
});