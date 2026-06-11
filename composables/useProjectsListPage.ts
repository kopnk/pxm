import { computed, onMounted, ref } from "vue";
import { useProjectsStore } from "@/stores/projects";
import { useProjectsApi } from "@/composables/useProjectsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useNotify } from "@/composables/useNotify";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  createStoreFilter,
  useMetaPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useProjectsListPage = () => {
  const store = useProjectsStore();
  const { getProjects, deleteProject } = useProjectsApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("projects");
  const { handle } = useFormHandler();
  const notify = useNotify();

  const expandedRow = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const fetchError = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const statusFilter = createStoreFilter(store, "status");

  const deleteTargetProject = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const { showingStart, showingEnd } = useMetaPaginationRange(store.meta);

  const fetchProjects = async (page = store.meta.page, showToast = true) => {
    try {
      fetchError.value = null;
      await getProjects({
        page,
        limit: store.meta.limit,
      });
    } catch (err: unknown) {
      fetchError.value = getApiErrorMessage(err, "Failed to load projects");

      if (showToast) {
        notify.error(fetchError.value);
      }

      throw err;
    }
  };

  onMounted(() => {
    void fetchProjects(1).catch(() => {});
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchProjects(1).catch(() => {}),
  );

  watchStoreFilters(
    () => [store.filters.status] as const,
    () => void fetchProjects(1).catch(() => {}),
  );

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
    if (!deleteTargetId.value || deletingId.value) return;

    const targetId = deleteTargetId.value;

    try {
      await handle(async () => {
        deletingId.value = targetId;

        await deleteProject(targetId);

        if (expandedRow.value === targetId) {
          expandedRow.value = null;
        }

        await fetchProjects(store.meta.page, false);
      }, toastSuccessDeleted("project"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const nextPage = () => {
    if (store.meta.page < store.meta.totalPages) {
      void fetchProjects(store.meta.page + 1).catch(() => {});
    }
  };

  const prevPage = () => {
    if (store.meta.page > 1) {
      void fetchProjects(store.meta.page - 1).catch(() => {});
    }
  };

  const toggleRow = (id: string) => {
    expandedRow.value = expandedRow.value === id ? null : id;
  };

  const getRowNumber = (index: number) =>
    (store.meta.page - 1) * store.meta.limit + index + 1;

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-";

    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return "-";

    return numberValue.toLocaleString("id-ID");
  };

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    expandedRow,
    deletingId,
    fetchError,
    showDeleteModal,
    deleteTargetProject,
    searchFilter,
    statusFilter,
    showingStart,
    showingEnd,
    openDeleteModal,
    cancelDelete,
    performDelete,
    nextPage,
    prevPage,
    toggleRow,
    getRowNumber,
    formatCurrency,
  };
};
