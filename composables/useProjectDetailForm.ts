import { computed, reactive, ref, watch } from "vue";
import { apiFetch } from "~/utils/apiFetch";

type ProjectDetailStatus = "active" | "delay" | "closed" | "cancelled";

interface ProjectOption {
  id: string;
  projectName: string;
  poNumber: string;
}

interface RegionOption {
  id: string;
  name: string;
}

export interface ProjectDetailFormState {
  projectId: string | null;
  cityKabId: string | null;
  lineNumber: number | null;
  systemkey: string;
  neId: string;
  materialId: string | null;
  materialName: string | null;
  siteId: string | null;
  siteName: string | null;
  picArea: string | null;
  quantity: number | null;
  uom: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  status: ProjectDetailStatus;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  taxOut: number | null;
}

interface ProjectDetailResponse extends Partial<ProjectDetailFormState> {
  projectName?: string | null;
  poNumber?: string | null;
  regionId?: string | null;
  subRegionId?: string | null;
}

const defaultForm = (): ProjectDetailFormState => ({
  projectId: null,
  cityKabId: null,
  lineNumber: null,
  systemkey: "",
  neId: "",
  materialId: null,
  materialName: null,
  siteId: null,
  siteName: null,
  picArea: null,
  quantity: null,
  uom: null,
  unitPrice: null,
  totalPrice: null,
  status: "active",
  remarksProjectsDetails: null,
  remarksDelay: null,
  remarksCancel: null,
  taxOut: null,
});

const nullableText = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const useProjectDetailForm = () => {
  const form = reactive<ProjectDetailFormState>(defaultForm());

  const projects = ref<ProjectOption[]>([]);
  const regions = ref<RegionOption[]>([]);
  const subRegions = ref<RegionOption[]>([]);
  const cities = ref<RegionOption[]>([]);

  const selectedRegion = ref<string | null>(null);
  const selectedSubRegion = ref<string | null>(null);
  const projectSearch = ref("");
  const showProjectDropdown = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isPreloading = ref(false);

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "delay", label: "Delay" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const isValid = computed(
    () =>
      !!form.projectId &&
      !!form.cityKabId &&
      !!nullableText(form.siteName) &&
      form.quantity != null &&
      form.unitPrice != null &&
      form.systemkey.trim().length > 0,
  );

  const getErrorMessage = (err: any, fallback: string) =>
    err?.data?.message || err?.message || fallback;

  const runWithLoading = async <T>(action: () => Promise<T>, fallback: string) => {
    try {
      loading.value = true;
      error.value = null;
      return await action();
    } catch (err: any) {
      error.value = getErrorMessage(err, fallback);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadProjects = async (search = projectSearch.value) => {
    return runWithLoading(async () => {
      const res: any = await apiFetch("/api/projects", {
        query: {
          page: 1,
          limit: 20,
          search: search.trim() || undefined,
        },
      });

      projects.value = (res.data?.items ?? []).map((item: any) => ({
        id: item.id,
        projectName: item.projectName,
        poNumber: item.poNumber,
      }));

      return projects.value;
    }, "Failed to load projects");
  };

  const loadRegions = async () => {
    return runWithLoading(async () => {
      const res: any = await apiFetch("/api/regions", {
        query: { type: "region", limit: 1000 },
      });

      regions.value = res.data?.items ?? [];
      return regions.value;
    }, "Failed to load regions");
  };

  const loadSubRegions = async (regionId: string) => {
    return runWithLoading(async () => {
      const res: any = await apiFetch("/api/regions", {
        query: {
          type: "sub_region",
          parentId: regionId,
          limit: 1000,
        },
      });

      subRegions.value = res.data?.items ?? [];
      return subRegions.value;
    }, "Failed to load sub regions");
  };

  const loadCities = async (subRegionId: string) => {
    return runWithLoading(async () => {
      const res: any = await apiFetch("/api/regions", {
        query: {
          type: "city_kab",
          parentId: subRegionId,
          limit: 1000,
        },
      });

      cities.value = res.data?.items ?? [];
      return cities.value;
    }, "Failed to load cities");
  };

  const openProjectDropdown = async () => {
    showProjectDropdown.value = true;
    await loadProjects();
  };

  const selectProject = (project: ProjectOption) => {
    form.projectId = project.id;
    projectSearch.value = `${project.projectName} - ${project.poNumber}`;
    showProjectDropdown.value = false;
  };

  const resetProjectSelection = () => {
    form.projectId = null;
  };

  const fillFromDetail = async (detail: ProjectDetailResponse) => {
    isPreloading.value = true;

    Object.assign(form, {
      projectId: detail.projectId ?? null,
      cityKabId: detail.cityKabId ?? null,
      lineNumber: detail.lineNumber ?? null,
      systemkey: detail.systemkey ?? "",
      neId: detail.neId ?? "",
      materialId: detail.materialId ?? null,
      materialName: detail.materialName ?? null,
      siteId: detail.siteId ?? null,
      siteName: detail.siteName ?? null,
      picArea: detail.picArea ?? null,
      quantity: detail.quantity ?? null,
      uom: detail.uom ?? null,
      unitPrice: detail.unitPrice ?? null,
      totalPrice: detail.totalPrice ?? null,
      status: (detail.status ?? "active") as ProjectDetailStatus,
      remarksProjectsDetails: detail.remarksProjectsDetails ?? null,
      remarksDelay: detail.remarksDelay ?? null,
      remarksCancel: detail.remarksCancel ?? null,
      taxOut: detail.taxOut ?? null,
    });

    if (detail.projectName && detail.poNumber) {
      projectSearch.value = `${detail.projectName} - ${detail.poNumber}`;
    }

    selectedRegion.value = detail.regionId ?? null;
    if (detail.regionId) {
      await loadSubRegions(detail.regionId);
    }

    selectedSubRegion.value = detail.subRegionId ?? null;
    if (detail.subRegionId) {
      await loadCities(detail.subRegionId);
    }

    isPreloading.value = false;
  };

  const buildPayload = () => ({
    projectId: form.projectId,
    cityKabId: form.cityKabId,
    lineNumber: form.lineNumber,
    systemkey: form.systemkey.trim(),
    neId: form.neId.trim(),
    materialId: nullableText(form.materialId),
    materialName: nullableText(form.materialName),
    siteId: nullableText(form.siteId),
    siteName: nullableText(form.siteName),
    picArea: nullableText(form.picArea),
    quantity: form.quantity,
    uom: nullableText(form.uom),
    unitPrice: form.unitPrice,
    totalPrice: form.totalPrice,
    status: form.status,
    remarksProjectsDetails: nullableText(form.remarksProjectsDetails),
    remarksDelay: nullableText(form.remarksDelay),
    remarksCancel: nullableText(form.remarksCancel),
    taxOut: form.taxOut,
  });

  const resetForm = () => {
    Object.assign(form, defaultForm());
    selectedRegion.value = null;
    selectedSubRegion.value = null;
    projectSearch.value = "";
    showProjectDropdown.value = false;
    subRegions.value = [];
    cities.value = [];
  };

  watch(
    () => [form.quantity, form.unitPrice],
    () => {
      if (form.quantity != null && form.unitPrice != null) {
        form.totalPrice = form.quantity * form.unitPrice;
      } else {
        form.totalPrice = null;
      }
    },
  );

  watch(selectedRegion, async (value) => {
    if (!isPreloading.value) {
      selectedSubRegion.value = null;
      form.cityKabId = null;
      subRegions.value = [];
      cities.value = [];
    }

    if (value) {
      await loadSubRegions(value);
    }
  });

  watch(selectedSubRegion, async (value) => {
    if (!isPreloading.value) {
      form.cityKabId = null;
      cities.value = [];
    }

    if (value) {
      await loadCities(value);
    }
  });

  watch(projectSearch, async (value) => {
    if (!showProjectDropdown.value) return;
    resetProjectSelection();
    await loadProjects(value);
  });

  return {
    form,
    projects,
    regions,
    subRegions,
    cities,
    selectedRegion,
    selectedSubRegion,
    projectSearch,
    showProjectDropdown,
    loading,
    error,
    statusOptions,
    isValid,
    loadProjects,
    loadRegions,
    loadSubRegions,
    loadCities,
    openProjectDropdown,
    selectProject,
    fillFromDetail,
    buildPayload,
    resetForm,
  };
};
