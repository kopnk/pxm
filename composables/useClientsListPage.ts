import { computed, onMounted, ref } from "vue";
import { useClientsStore } from "@/stores/clients";
import { useClientsApi } from "@/composables/useClientsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import {
  changeFlatPage,
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useClientsListPage = () => {
  const store = useClientsStore();
  const { getClients, deleteClient } = useClientsApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("clients");
  const { handle } = useFormHandler();

  const deletingId = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const isActiveFilter = createStoreFilter(store, "isActive");
  const deleteTargetClient = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const fetchClients = async (page = store.page) => {
    await getClients({ page, limit: store.limit });
  };

  onMounted(() => {
    void fetchClients(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchClients(1),
  );

  watchStoreFilters(
    () => [store.filters.isActive] as const,
    () => void fetchClients(1),
  );

  const changePage = (page: number) => changeFlatPage(store, page, fetchClients);

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
        await deleteClient(targetId);
        await fetchClients(store.page);
      }, toastSuccessDeleted("client"));
      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    isActiveFilter,
    deletingId,
    showDeleteModal,
    deleteTargetClient,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    openDeleteModal,
    cancelDelete,
    performDelete,
    showingStart,
    showingEnd,
  };
};
