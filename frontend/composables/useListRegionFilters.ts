import { computed, onMounted, ref, watch } from "vue";
import { apiFetch } from "~/utils/apiFetch";

type RegionOption = { id: string; name: string };

type RegionFilterStore = {
  filters: { regionId: string; subRegionId: string };
  setFilters: (filters: Partial<{ regionId: string; subRegionId: string }>) => void;
};

/** Shared Region/Sub Region options for list-page filters. */
export function useListRegionFilters(store: RegionFilterStore) {
  const regions = ref<RegionOption[]>([]);
  const subRegions = ref<RegionOption[]>([]);

  const regionFilter = computed({
    get: () => store.filters.regionId,
    set: (regionId: string) => store.setFilters({ regionId }),
  });
  const subRegionFilter = computed({
    get: () => store.filters.subRegionId,
    set: (subRegionId: string) => store.setFilters({ subRegionId }),
  });

  const loadRegions = async () => {
    const response: any = await apiFetch("/api/regions/parent-options", {
      query: { type: "region" },
    });
    regions.value = response.data?.items ?? [];
  };

  const loadSubRegions = async (regionId: string) => {
    if (!regionId) {
      subRegions.value = [];
      return;
    }

    const response: any = await apiFetch("/api/regions", {
      query: { parentId: regionId, type: "sub_region", limit: 1000 },
    });
    subRegions.value = response.data?.items ?? [];
  };

  watch(
    regionFilter,
    (regionId, previousRegionId) => {
      if (previousRegionId !== undefined && regionId !== previousRegionId) {
        subRegionFilter.value = "";
      }
      void loadSubRegions(regionId);
    },
    { immediate: true },
  );

  onMounted(() => {
    void loadRegions();
  });

  return { regionFilter, subRegionFilter, regions, subRegions };
}
