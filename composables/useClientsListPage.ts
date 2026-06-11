import { onMounted, ref } from "vue";
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

  const searchFilter = createStoreFilter(store, "search");
  const isActiveFilter = createStoreFilter(store, "isActive");

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

  const remove = async (id: string, clientName?: string | null) => {
    if (!canDelete.value) return;

    const label = clientName?.trim() || "(no name)";
    const confirmed = window.confirm(`Delete client "${label}"?`);
    if (!confirmed) return;

    await handle(async () => {
      deletingId.value = id;
      await deleteClient(id);
      await fetchClients(store.page);
    }, toastSuccessDeleted("client"));

    deletingId.value = null;
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    isActiveFilter,
    deletingId,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    remove,
    showingStart,
    showingEnd,
  };
};
