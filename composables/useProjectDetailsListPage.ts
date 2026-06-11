import { computed, onMounted, ref } from "vue";
import { useProjectDetailsApi } from "@/composables/useProjectDetailsApi";
import { useProjectDetailsStore } from "@/stores/projectDetails";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useNotify } from "@/composables/useNotify";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";
import { detailStatusBadgeClass } from "~/lib/detailStatus";
import {
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useProjectDetailsListPage = () => {
  const store = useProjectDetailsStore();
  const { getProjectDetails, deleteProjectDetail } = useProjectDetailsApi();
  const { canCreate, canEdit, canDelete } =
    useListPagePermissions("project_details");
  const { handle } = useFormHandler();
  const notify = useNotify();

  const searchFilter = createStoreFilter(store, "search");
  const statusFilter = createStoreFilter(store, "status");

  const fetchError = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const deleteTargetId = ref<string | null>(null);
  const showDeleteModal = ref(false);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "delay", label: "Delay" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const deleteTarget = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  const fetchData = async (page = store.page, showToast = true) => {
    try {
      fetchError.value = null;
      store.setPage(page);

      await getProjectDetails({
        page,
        limit: store.limit,
      });
    } catch (err: unknown) {
      fetchError.value = getApiErrorMessage(err, "Failed to load project details");

      if (showToast) {
        notify.error(fetchError.value);
      }

      throw err;
    }
  };

  onMounted(() => {
    void fetchData(1).catch(() => {});
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchData(1).catch(() => {}),
  );

  watchStoreFilters(
    () => [store.filters.status] as const,
    () => void fetchData(1).catch(() => {}),
  );

  const prevPage = () => {
    if (store.page > 1) {
      void fetchData(store.page - 1).catch(() => {});
    }
  };

  const nextPage = () => {
    if (store.page < store.totalPages) {
      void fetchData(store.page + 1).catch(() => {});
    }
  };

  const openDeleteModal = (id: string) => {
    if (!canDelete.value) return;
    deleteTargetId.value = id;
    showDeleteModal.value = true;
  };

  const cancelDelete = () => {
    if (deletingId.value) return;
    deleteTargetId.value = null;
    showDeleteModal.value = false;
  };

  const performDelete = async () => {
    if (!deleteTargetId.value || deletingId.value) return;

    const targetId = deleteTargetId.value;

    try {
      await handle(async () => {
        deletingId.value = targetId;
        await deleteProjectDetail(targetId);
        await fetchData(store.page, false);
      }, toastSuccessDeleted("projectDetail"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-";

    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return "-";

    return new Intl.NumberFormat("id-ID").format(numberValue);
  };

  const getRowNumber = (index: number) =>
    (store.page - 1) * store.limit + index + 1;

  const getStatusBadgeClass = detailStatusBadgeClass;

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    searchFilter,
    statusFilter,
    statusOptions,
    fetchError,
    deletingId,
    deleteTarget,
    showDeleteModal,
    showingStart,
    showingEnd,
    fetchData,
    prevPage,
    nextPage,
    openDeleteModal,
    cancelDelete,
    performDelete,
    formatCurrency,
    getRowNumber,
    getStatusBadgeClass,
  };
};
