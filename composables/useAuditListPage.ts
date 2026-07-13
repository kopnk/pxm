import { computed, onMounted, ref } from "vue";
import {
  useAuditApi,
  AUDIT_ACTION_OPTIONS,
} from "@/composables/useAuditApi";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useFormHandler } from "@/composables/useFormHandler";
import {
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useAuditListPage = () => {
  const { store, getAuditLogs, bulkDeleteAuditLogs } = useAuditApi();
  const { handle } = useFormHandler();

  const searchFilter = createStoreFilter(store, "search");
  const actionFilter = createStoreFilter(store, "action");
  const targetTableFilter = createStoreFilter(store, "targetTable");

  const selectedIds = ref<string[]>([]);
  const deleting = ref(false);
  const showDeleteModal = ref(false);

  const fetchAuditLogs = async (page = store.page) => {
    await getAuditLogs({ page, limit: store.limit });
  };

  onMounted(() => {
    void fetchAuditLogs(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchAuditLogs(1),
  );

  watchStoreFilters(
    () => [store.filters.action, store.filters.targetTable] as const,
    () => void fetchAuditLogs(1),
  );

  const changePage = (page: number) => {
    if (page < 1 || page > store.totalPages) return;
    void fetchAuditLogs(page);
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  const visibleIds = computed(() => store.items.map((item) => item.id));
  const isSelected = (id: string) => selectedIds.value.includes(id);

  const allVisibleSelected = computed(
    () =>
      visibleIds.value.length > 0 &&
      visibleIds.value.every((id) => selectedIds.value.includes(id)),
  );

  const toggleRow = (id: string) => {
    if (isSelected(id)) {
      selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
      return;
    }

    selectedIds.value = [...selectedIds.value, id];
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected.value) {
      selectedIds.value = selectedIds.value.filter(
        (id) => !visibleIds.value.includes(id),
      );
      return;
    }

    selectedIds.value = [...new Set([...selectedIds.value, ...visibleIds.value])];
  };

  const formatMetadata = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) return "-";

    try {
      const text = JSON.stringify(metadata, null, 0);
      return text.length > 120 ? `${text.slice(0, 120)}...` : text;
    } catch {
      return "-";
    }
  };

  const metadataTitle = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) return "";

    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return "";
    }
  };

  const displayUser = (item: (typeof store.items)[number]) => {
    if (!item.user) return "-";
    if (item.user.name) return item.user.name;
    return item.user.email;
  };

  const actionBadgeClass = (value: string) => {
    switch (value) {
      case "CREATE":
        return "bg-success";
      case "UPDATE":
        return "bg-primary";
      case "DELETE":
        return "bg-danger";
      case "LOGIN":
        return "bg-info text-dark";
      case "LOGOUT":
        return "bg-secondary";
      case "CHANGE_PASSWORD":
        return "bg-warning text-dark";
      default:
        return "bg-light text-dark";
    }
  };

  const openDeleteModal = () => {
    if (!selectedIds.value.length || deleting.value) return;
    showDeleteModal.value = true;
  };

  const cancelDelete = () => {
    if (deleting.value) return;
    showDeleteModal.value = false;
  };

  const deleteSelected = async () => {
    if (!selectedIds.value.length) return;

    try {
      await handle(async () => {
        deleting.value = true;
        const ids = [...selectedIds.value];
        await bulkDeleteAuditLogs(ids);
        selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
        await fetchAuditLogs(store.page);
      }, toastSuccessDeleted("auditLog"));
      showDeleteModal.value = false;
    } finally {
      deleting.value = false;
    }
  };

  return {
    store,
    searchFilter,
    actionFilter,
    targetTableFilter,
    selectedIds,
    deleting,
    showDeleteModal,
    AUDIT_ACTION_OPTIONS,
    changePage,
    showingStart,
    showingEnd,
    isSelected,
    allVisibleSelected,
    toggleRow,
    toggleSelectAllVisible,
    formatMetadata,
    metadataTitle,
    displayUser,
    actionBadgeClass,
    openDeleteModal,
    cancelDelete,
    deleteSelected,
  };
};
