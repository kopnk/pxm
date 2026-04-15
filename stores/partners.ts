import { defineStore } from "pinia";

interface Partner {
  id: string;
  name: string;
  npwp: string | null;
  bankName: string | null;
  bankAccount: string | null;
  partnerType: string | null;
  addressText: string | null;
  addressMeta?: {
    province?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  } | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  rating: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PartnerListState {
  items: Partner[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const usePartnersStore = defineStore("partners", {
  state: () => ({
    items: [] as Partner[],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    loading: false,
  }),

  actions: {
    setPartners(data: PartnerListState) {
      this.items = data.items;
      this.page = data.page;
      this.limit = data.limit;
      this.total = data.total;
      this.totalPages = data.totalPages;
    },

    setLoading(val: boolean) {
      this.loading = val;
    },
  },
});
