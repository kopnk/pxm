import { onMounted } from "vue";
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

  const searchFilter = createStoreFilter(store, "search");
  const isActiveFilter = createStoreFilter(store, "isActive");

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

  const remove = async (id: string, partnerName?: string | null) => {
    if (!canDelete.value) return;
    const label = partnerName?.trim() || "(no name)";
    const confirmed = window.confirm(`Delete partner "${label}"?`);
    if (!confirmed) return;

    await handle(async () => {
      await deletePartner(id);
      await fetchPartners(store.page);
    }, toastSuccessDeleted("partner"));
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    searchFilter,
    isActiveFilter,
    canCreate,
    canEdit,
    canDelete,
    changePage,
    goCreate,
    goEdit,
    remove,
    showingStart,
    showingEnd,
  };
};
