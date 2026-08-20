import { computed, onMounted, ref } from "vue";
import { useRouter } from "#imports";
import { usePartnersStore } from "@/stores/partners";
import { usePartnersApi } from "@/composables/usePartnersApi";
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

export const usePartnersListPage = () => {
  const router = useRouter();
  const store = usePartnersStore();
  const { getPartners, deletePartner } = usePartnersApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("partners");
  const { handle } = useFormHandler();
  const deletingId = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const isActiveFilter = createStoreFilter(store, "isActive");
  const deleteTargetPartner = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const fetchPartners = async (page = store.page) => {
    await getPartners({ page, limit: store.limit });
  };

  onMounted(() => {
    void fetchPartners(1);
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchPartners(1),
  );

  watchStoreFilters(
    () => [store.filters.isActive] as const,
    () => void fetchPartners(1),
  );

  const changePage = (page: number) => changeFlatPage(store, page, fetchPartners);

  const goCreate = () => router.push("/partners/create");

  const goEdit = (id: string) => {
    if (!canEdit.value) return;
    router.push({ path: "/partners/update", query: { id } });
  };

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
        await deletePartner(targetId);
        await fetchPartners(store.page);
      }, toastSuccessDeleted("partner"));

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
    deleteTargetPartner,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    goCreate,
    goEdit,
    openDeleteModal,
    cancelDelete,
    performDelete,
    showingStart,
    showingEnd,
  };
};
