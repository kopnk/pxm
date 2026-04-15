import { defineStore } from "pinia"

export interface RegionItem {
  id: string
  name: string
  type: "region" | "sub_region" | "city_kab"
  parentId: string | null
}

export const useRegionsStore = defineStore("regions", {
  state: () => ({
    regions: [] as RegionItem[],
    subRegions: [] as RegionItem[],
    cities: [] as RegionItem[],
    loading: false,
  }),

  actions: {
    setRegions(data: RegionItem[]) {
      this.regions = data
    },
    setSubRegions(data: RegionItem[]) {
      this.subRegions = data
    },
    setCities(data: RegionItem[]) {
      this.cities = data
    },
    setLoading(val: boolean) {
      this.loading = val
    },
    resetCascade() {
      this.subRegions = []
      this.cities = []
    }
  }
})