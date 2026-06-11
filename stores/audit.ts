import { defineStore } from "pinia";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

export interface AuditLogAccess {
  deviceType: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  os: string;
  browser: string;
  ip: string;
}

export interface AuditLogUser {
  email: string;
  role: string | null;
  name: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  access: AuditLogAccess;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: AuditLogUser | null;
}

export const useAuditStore = defineStore("audit", {
  state: () => ({
    items: [] as AuditLogItem[],
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
    loading: false,
    filters: {
      search: "",
      action: "",
      targetTable: "",
    },
  }),

  actions: {
    setAuditList(data: {
      items: AuditLogItem[];
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

    setFilters(
      filters: Partial<{ search: string; action: string; targetTable: string }>,
    ) {
      this.filters = { ...this.filters, ...filters };
    },

    removeItems(ids: string[]) {
      const idSet = new Set(ids);
      this.items = this.items.filter((item) => !idSet.has(item.id));
      this.total = Math.max(0, this.total - ids.length);
    },

    clear() {
      this.items = [];
    },
  },
});
