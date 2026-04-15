import { useRegionsStore } from "@/stores/regions"
import { apiFetch } from "~/utils/apiFetch"

export const useRegionsApi = () => {
  const store = useRegionsStore()

  const fetchRegions = async () => {
    store.setLoading(true)
    try {
      const res: any = await apiFetch("/api/regions", {
        query: { type: "region", limit: 1000 },
      })
      store.setRegions(res.data.items)
    } finally {
      store.setLoading(false)
    }
  }

  const fetchSubRegions = async (regionId: string) => {
    store.setLoading(true)
    try {
      const res: any = await apiFetch("/api/regions", {
        query: {
          type: "sub_region",
          parentId: regionId,
          limit: 1000,
        },
      })
      store.setSubRegions(res.data.items)
    } finally {
      store.setLoading(false)
    }
  }

  const fetchCities = async (subRegionId: string) => {
    store.setLoading(true)
    try {
      const res: any = await apiFetch("/api/regions", {
        query: {
          type: "city_kab",
          parentId: subRegionId,
          limit: 1000,
        },
      })
      store.setCities(res.data.items)
    } finally {
      store.setLoading(false)
    }
  }

  return {
    fetchRegions,
    fetchSubRegions,
    fetchCities
  }
}