import { onMounted, ref, watch } from "vue";
import { useDcnApi, DCN_OUT_TYPE_OPTIONS } from "@/composables/useDcnApi";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import {
  changeFlatPage,
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
} from "~/lib/listPage";

export const useDcnListPage = () => {
  const { store, getDcns, deleteDcn } = useDcnApi();
  const { handle } = useFormHandler();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("dcn");

  const deletingId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const flowFilter = createStoreFilter(store, "flow");
  const typeFilter = createStoreFilter(store, "type");

  const fetchDcns = async (page = store.page) => {
    await getDcns({ page, limit: store.limit });
  };

  onMounted(() => {
    void fetchDcns(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchDcns(1),
  );

  watch(
    () => [store.filters.flow, store.filters.type] as const,
    ([nextFlow]) => {
      if (nextFlow !== "out" && store.filters.type) {
        store.setFilters({ type: "" });
      }
      void fetchDcns(1);
    },
  );

  const changePage = (page: number) => changeFlatPage(store, page, fetchDcns);

  const remove = async (
    id: string,
    number?: string | null,
    letterDate?: string | null,
  ) => {
    if (!canDelete.value) return;
    const dcnNumber = number?.trim() || "(no number)";
    const dateLabel = letterDate?.trim() || "unknown date";
    const confirmed = window.confirm(
      `Delete DCN "${dcnNumber}" dated ${dateLabel}?`,
    );
    if (!confirmed) return;

    try {
      await handle(async () => {
        deletingId.value = id;
        await deleteDcn(id);
        await fetchDcns(store.page);
      }, toastSuccessDeleted("dcn"));
    } finally {
      deletingId.value = null;
    }
  };

  const flowBadgeClass = (value: string) =>
    value === "out" ? "bg-warning text-dark" : "bg-info text-dark";

  const typeLabelByCode = DCN_OUT_TYPE_OPTIONS.reduce<Record<string, string>>(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {},
  );

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    flowFilter,
    typeFilter,
    deletingId,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    remove,
    flowBadgeClass,
    typeLabelByCode,
    showingStart,
    showingEnd,
    DCN_OUT_TYPE_OPTIONS,
  };
};
