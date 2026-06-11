import { onMounted, ref, watch } from "vue";
import { apiFetch } from "~/utils/apiFetch";

export type RegionOption = {
  id: string;
  name: string;
  type: string;
};

type InitialRegionArea = {
  region?: string | null;
  area?: string | null;
};

export const useUserRegionSelect = (initial?: InitialRegionArea) => {
  const regions = ref<RegionOption[]>([]);
  const areas = ref<RegionOption[]>([]);
  const selectedRegionId = ref("");
  const selectedAreaId = ref("");
  const regionsLoading = ref(false);
  const areasLoading = ref(false);
  const isHydrating = ref(false);

  const loadRegions = async () => {
    regionsLoading.value = true;
    try {
      const res = await apiFetch<{
        data: { items: RegionOption[] };
      }>("/api/users/region-options", {
        query: { type: "region" },
      });
      regions.value = res.data.items ?? [];
    } finally {
      regionsLoading.value = false;
    }
  };

  const loadAreas = async (regionId: string) => {
    areasLoading.value = true;
    try {
      const res = await apiFetch<{
        data: { items: RegionOption[] };
      }>("/api/users/region-options", {
        query: { type: "sub_region", parentId: regionId },
      });
      areas.value = res.data.items ?? [];
    } finally {
      areasLoading.value = false;
    }
  };

  const hydrateFromNames = async (
    regionName?: string | null,
    areaName?: string | null,
  ) => {
    isHydrating.value = true;

    try {
      await loadRegions();

      const region = regions.value.find(
        (item) => item.name === String(regionName ?? "").trim(),
      );

      if (!region) {
        selectedRegionId.value = "";
        selectedAreaId.value = "";
        return;
      }

      selectedRegionId.value = region.id;
      await loadAreas(region.id);

      const area = areas.value.find(
        (item) => item.name === String(areaName ?? "").trim(),
      );
      selectedAreaId.value = area?.id ?? "";
    } finally {
      isHydrating.value = false;
    }
  };

  watch(selectedRegionId, (regionId) => {
    if (isHydrating.value) return;

    selectedAreaId.value = "";
    areas.value = [];

    if (regionId) {
      void loadAreas(regionId);
    }
  });

  onMounted(() => {
    if (initial?.region || initial?.area) {
      void hydrateFromNames(initial.region, initial.area);
      return;
    }

    void loadRegions();
  });

  const getSelectedNames = () => {
    const region = regions.value.find(
      (item) => item.id === selectedRegionId.value,
    );
    const area = areas.value.find((item) => item.id === selectedAreaId.value);

    return {
      regionName: region?.name ?? null,
      areaName: area?.name ?? null,
    };
  };

  const assertRegionAreaSelected = () => {
    const { regionName, areaName } = getSelectedNames();

    if (!regionName) {
      throw new Error("Region is required");
    }

    if (!areaName) {
      throw new Error("Area is required");
    }

    return { regionName, areaName };
  };

  return {
    regions,
    areas,
    selectedRegionId,
    selectedAreaId,
    regionsLoading,
    areasLoading,
    getSelectedNames,
    assertRegionAreaSelected,
  };
};
