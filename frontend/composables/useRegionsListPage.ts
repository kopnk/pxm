import { computed, onMounted, ref } from "vue";
import { useRegionMasterStore } from "@/stores/regionMaster";
import type { RegionMasterItem, RegionType } from "@/stores/regionMaster";
import { useRegionMasterApi } from "@/composables/useRegionMasterApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { REGION_TYPE_LABELS } from "@/composables/useRegionForm";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";
import { apiFetch } from "~/utils/apiFetch";
import { useNotify } from "@/composables/useNotify";
import {
  changeFlatPage,
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

type RegionOption = {
  id: string;
  name: string;
};

export const useRegionsListPage = () => {
  const store = useRegionMasterStore();
  const { getRegions, deleteRegion } = useRegionMasterApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("regions");
  const { handle } = useFormHandler();
  const notify = useNotify();

  const deletingId = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const regionFilter = createStoreFilter(store, "regionId");
  const subRegionFilter = createStoreFilter(store, "subRegionId");
  const regionOptions = ref<RegionOption[]>([]);
  const subRegionOptions = ref<RegionOption[]>([]);
  const filtersLoading = ref(false);
  const deleteTargetRegion = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const fetchRegions = async (page = store.page) => {
    try {
      await getRegions({ page, limit: store.limit });
    } catch (error) {
      notify.error(getApiErrorMessage(error, "Failed to load regions"));
    }
  };

  const loadRegionOptions = async (query: {
    type: RegionType;
    parentId?: string;
    regionId?: string;
    subRegionId?: string;
  }) => {
    const res: any = await apiFetch("/api/regions", {
      query: {
        type: query.type,
        parentId: query.parentId || undefined,
        regionId: query.regionId || undefined,
        subRegionId: query.subRegionId || undefined,
        page: 1,
        limit: 1000,
      },
    });

    return (res.data?.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
    })) as RegionOption[];
  };

  const loadFilterOptions = async () => {
    filtersLoading.value = true;
    try {
      const [regions, subRegions] = await Promise.all([
        loadRegionOptions({ type: "region" }),
        loadRegionOptions({
          type: "sub_region",
          parentId: store.filters.regionId || undefined,
        }),
      ]);

      regionOptions.value = regions;
      subRegionOptions.value = subRegions;
    } catch (error) {
      notify.error(getApiErrorMessage(error, "Failed to load region filters"));
    } finally {
      filtersLoading.value = false;
    }
  };

  onMounted(() => {
    void loadFilterOptions();
    void fetchRegions(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchRegions(1),
  );

  watchStoreFilters(
    () => [store.filters.regionId, store.filters.subRegionId] as const,
    () => void fetchRegions(1),
  );

  watchStoreFilters(
    () => [store.filters.regionId] as const,
    async () => {
      store.setFilters({ subRegionId: "", cityKabId: "" });
      try {
        subRegionOptions.value = await loadRegionOptions({
          type: "sub_region",
          parentId: store.filters.regionId || undefined,
        });
      } catch (error) {
        notify.error(getApiErrorMessage(error, "Failed to load region filters"));
      }
    },
  );

  watchStoreFilters(
    () => [store.filters.subRegionId] as const,
    () => {
      store.setFilters({ cityKabId: "" });
    },
  );

  const changePage = (page: number) => changeFlatPage(store, page, fetchRegions);

  const openDeleteModal = (id: string) => {
    if (!canDelete.value) return;
    deleteTargetId.value = id;
    showDeleteModal.value = true;
  };

  const cancelDelete = () => {
    if (deletingId.value) return;
    showDeleteModal.value = false;
    deleteTargetId.value = null;
  };

  const performDelete = async () => {
    if (!deleteTargetId.value) return;

    const targetId = deleteTargetId.value;

    try {
      await handle(async () => {
        deletingId.value = targetId;
        await deleteRegion(targetId);
        await fetchRegions(store.page);
      }, toastSuccessDeleted("region"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const typeLabel = (type: RegionType) => REGION_TYPE_LABELS[type] ?? type;
  const hierarchyLabel = (item: RegionMasterItem) => {
    if (item.type === "region") return "-";

    const path =
      item.type === "city_kab"
        ? [item.regionName, item.subRegionName]
        : [item.regionName];

    return path.filter(Boolean).join(" / ") || item.parentName || "-";
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    regionFilter,
    subRegionFilter,
    regionOptions,
    subRegionOptions,
    filtersLoading,
    deletingId,
    showDeleteModal,
    deleteTargetRegion,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    openDeleteModal,
    cancelDelete,
    performDelete,
    typeLabel,
    hierarchyLabel,
    showingStart,
    showingEnd,
  };
};
