import { defineStore } from "pinia";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

export type RegionType = "region" | "sub_region" | "city_kab";

export interface RegionMasterItem {
  id: string;
  name: string;
  type: RegionType;
  parentId: string | null;
  parentName?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  subRegionId?: string | null;
  subRegionName?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useRegionMasterStore = defineStore("regionMaster", {
  state: () => ({
    items: [] as RegionMasterItem[],
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
    loading: false,
    filters: {
      search: "",
      regionId: "",
      subRegionId: "",
      cityKabId: "",
    },
  }),

  actions: {
    setList(data: {
      items: RegionMasterItem[];
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

    setFilters(
      filters: Partial<{
        search: string;
        regionId: string;
        subRegionId: string;
        cityKabId: string;
      }>,
    ) {
      const nextFilters = { ...this.filters, ...filters };
      const unchanged = Object.entries(nextFilters).every(
        ([key, value]) =>
          Object.is(this.filters[key as keyof typeof this.filters], value),
      );

      if (unchanged) return;

      this.filters = nextFilters;
    },

    setPage(page: number) {
      this.page = page;
    },

    setLoading(val: boolean) {
      this.loading = val;
    },

    removeItem(id: string) {
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});
