import { onMounted, ref } from "vue";
import { useRegionMasterStore } from "@/stores/regionMaster";
import { useRegionMasterApi } from "@/composables/useRegionMasterApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { REGION_TYPE_LABELS } from "@/composables/useRegionForm";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import type { RegionType } from "@/stores/regionMaster";
import {
  changeFlatPage,
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useRegionsListPage = () => {
  const store = useRegionMasterStore();
  const { getRegions, deleteRegion } = useRegionMasterApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("regions");
  const { handle } = useFormHandler();

  const deletingId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const typeFilter = createStoreFilter(store, "type");

  const fetchRegions = async (page = store.page) => {
    await getRegions({ page, limit: store.limit });
  };

  onMounted(() => {
    void fetchRegions(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchRegions(1),
  );

  watchStoreFilters(
    () => [store.filters.type] as const,
    () => void fetchRegions(1),
  );

  const changePage = (page: number) => changeFlatPage(store, page, fetchRegions);

  const remove = async (id: string, name?: string | null) => {
    if (!canDelete.value) return;

    const label = name?.trim() || "(no name)";
    const confirmed = window.confirm(`Delete region "${label}"?`);
    if (!confirmed) return;

    await handle(async () => {
      deletingId.value = id;
      await deleteRegion(id);
      await fetchRegions(store.page);
    }, toastSuccessDeleted("region"));

    deletingId.value = null;
  };

  const typeLabel = (type: RegionType) => REGION_TYPE_LABELS[type] ?? type;

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    typeFilter,
    deletingId,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    remove,
    typeLabel,
    showingStart,
    showingEnd,
  };
};
