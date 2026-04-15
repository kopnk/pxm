// stores/projectFinancials.ts
import { defineStore } from "pinia";

/* ================= TYPES ================= */

export type ProjectFinancialStatus =
  | "draft"
  | "issued"
  | "approved"
  | "paid"
  | "cancelled";

export interface ProjectFinancialItem {
  id: string;

  projectId: string;
  projectDetailId: string;

  projectName?: string | null;
  /** Dari join `projects` */
  projectPoNumber?: string | null;
  /** Dari join `project_details` */
  detailMaterialName?: string | null;
  detailSystemkey?: string | null;
  detailSiteId?: string | null;
  detailSiteName?: string | null;

  /** Dari left join `clients` */
  clientName?: string | null;
  clientNpwp?: string | null;
  clientAddressText?: string | null;
  clientAddressMeta?: Record<string, unknown> | null;
  /** Dari left join `partners` */
  partnerName?: string | null;
  partnerNpwp?: string | null;
  partnerAddressText?: string | null;
  partnerAddressMeta?: Record<string, unknown> | null;

  taxIn?: unknown;
  taxOut?: unknown;
  pph?: unknown;

  docType?: string | null;
  docNumber?: string | null;
  docDate?: string | null;

  // partner/client invoice fields
  bastNumber?: string | null;
  bastDate?: string | null;
  balapNumber?: string | null;
  balapDate?: string | null;

  poNumberPartner?: string | null;
  poDatePartner?: string | null;
  invoiceNumberPartner?: string | null;
  invoiceDatePartner?: string | null;
  fpNumberPartner?: string | null;
  fpDatePartner?: string | null;
  qtyPartner?: number | null;
  unitPricePartner?: number | null;

  poNumberClient?: string | null;
  poDateClient?: string | null;
  invoiceNumberClient?: string | null;
  invoiceDateClient?: string | null;
  fpNumberClient?: string | null;
  fpDateClient?: string | null;
  qtyClient?: number | null;
  unitPriceClient?: number | null;

  flowDirection?: string | null;

  status: ProjectFinancialStatus;

  note?: string | null;

  createdUser: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectFinancialsState {
  items: ProjectFinancialItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
}

/* ================= STORE ================= */

export const useProjectFinancialsStore = defineStore(
  "projectFinancials",
  {
    state: (): ProjectFinancialsState => ({
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      loading: false,
    }),

    actions: {
      /* ===== SETTERS ===== */

      setProjectFinancials(payload: {
        items: ProjectFinancialItem[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }) {
        this.items = [...payload.items]; // force reactivity
        this.page = payload.page;
        this.limit = payload.limit;
        this.total = payload.total;
        this.totalPages = payload.totalPages;
      },

      setItems(items: ProjectFinancialItem[]) {
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
  }
);