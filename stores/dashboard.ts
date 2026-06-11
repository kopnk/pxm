import { defineStore } from "pinia";

export const useDashboardStore = defineStore("dashboard", {
  state: () => ({
    filters: {
      projectKeyword: "",
      regionFilter: "",
      subRegionFilter: "",
    },
  }),

  actions: {
    setFilters(
      filters: Partial<{
        projectKeyword: string;
        regionFilter: string;
        subRegionFilter: string;
      }>,
    ) {
      this.filters = { ...this.filters, ...filters };
    },
  },
});
