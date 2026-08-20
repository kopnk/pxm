import { computed, onMounted, ref, watch } from "vue";
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
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const flowFilter = createStoreFilter(store, "flow");
  const typeFilter = createStoreFilter(store, "type");
  const deleteTargetDcn = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

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
        await deleteDcn(targetId);
        await fetchDcns(store.page);
      }, toastSuccessDeleted("dcn"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
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
    showDeleteModal,
    deleteTargetDcn,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    openDeleteModal,
    cancelDelete,
    performDelete,
    flowBadgeClass,
    typeLabelByCode,
    showingStart,
    showingEnd,
    DCN_OUT_TYPE_OPTIONS,
  };
};
