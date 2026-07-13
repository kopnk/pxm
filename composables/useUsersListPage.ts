import { computed, onMounted, ref } from "vue";
import { useUsersStore } from "@/stores/users";
import { useUsersApi } from "@/composables/useUsersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useNotify } from "@/composables/useNotify";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";
import { passwordResetToDefaultMessage } from "@/lib/entityMessages";
import { canManageUserInList } from "~/lib/userRoles";
import {
  createStoreFilter,
  useMetaPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useUsersListPage = () => {
  const store = useUsersStore();
  const { getUsers, deleteUser, resetUserPassword } = useUsersApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions("users");
  const { handle } = useFormHandler();
  const notify = useNotify();

  const expandedRow = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const resettingId = ref<string | null>(null);
  const fetchError = ref<string | null>(null);
  const showDeleteModal = ref(false);
  const showResetModal = ref(false);
  const deleteTargetId = ref<string | null>(null);
  const resetTargetId = ref<string | null>(null);

  const searchFilter = createStoreFilter(store, "search");
  const roleFilter = createStoreFilter(store, "role");
  const isActiveFilter = createStoreFilter(store, "isActive");

  const deleteTargetUser = computed(() =>
    store.items.find((item) => item.id === deleteTargetId.value),
  );

  const resetTargetUser = computed(() =>
    store.items.find((item) => item.id === resetTargetId.value),
  );

  const { showingStart, showingEnd } = useMetaPaginationRange(store.meta);

  const fetchUsers = async (page = store.meta.page, showToast = true) => {
    try {
      fetchError.value = null;
      await getUsers({ page, limit: store.meta.limit });
    } catch (err: unknown) {
      fetchError.value = getApiErrorMessage(err, "Failed to load users");

      if (showToast) {
        notify.error(fetchError.value);
      }

      throw err;
    }
  };

  onMounted(() => {
    void fetchUsers(1).catch(() => {});
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchUsers(1).catch(() => {}),
  );

  watchStoreFilters(
    () => [store.filters.role, store.filters.isActive] as const,
    () => void fetchUsers(1).catch(() => {}),
  );

  const canEditUser = (role: string) =>
    canEdit.value && canManageUserInList(role);

  const canDeleteUser = (role: string) =>
    canDelete.value && canManageUserInList(role);

  const findManageableUser = (
    id: string,
    canManage: (role: string) => boolean,
  ) => {
    const target = store.items.find((item) => item.id === id);
    if (!target || !canManage(target.role)) return null;
    return target;
  };

  const openDeleteModal = (id: string) => {
    if (!canDelete.value) return;

    const target = findManageableUser(id, canDeleteUser);
    if (!target) return;

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
        await deleteUser(targetId);

        if (expandedRow.value === targetId) {
          expandedRow.value = null;
        }

        await fetchUsers(store.meta.page, false);
      }, toastSuccessDeleted("user"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const openResetModal = (id: string) => {
    if (!canEdit.value) return;

    const target = findManageableUser(id, canEditUser);
    if (!target) return;

    resetTargetId.value = id;
    showResetModal.value = true;
  };

  const cancelReset = () => {
    if (resettingId.value) return;
    showResetModal.value = false;
    resetTargetId.value = null;
  };

  const performReset = async () => {
    if (!resetTargetId.value || resettingId.value) return;

    const targetId = resetTargetId.value;

    try {
      await handle(async () => {
        resettingId.value = targetId;
        const response = await resetUserPassword(targetId);
        await fetchUsers(store.meta.page, false);
        return response;
      }, passwordResetToDefaultMessage());

      showResetModal.value = false;
      resetTargetId.value = null;
    } catch {
      // `useFormHandler` already shows the toast.
    } finally {
      resettingId.value = null;
    }
  };

  const nextPage = () => {
    if (store.meta.page < store.meta.totalPages) {
      void fetchUsers(store.meta.page + 1).catch(() => {});
    }
  };

  const prevPage = () => {
    if (store.meta.page > 1) {
      void fetchUsers(store.meta.page - 1).catch(() => {});
    }
  };

  const toggleRow = (id: string) => {
    expandedRow.value = expandedRow.value === id ? null : id;
  };

  const getRowNumber = (index: number) =>
    (store.meta.page - 1) * store.meta.limit + index + 1;

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    canEditUser,
    canDeleteUser,
    expandedRow,
    deletingId,
    resettingId,
    fetchError,
    showDeleteModal,
    showResetModal,
    deleteTargetUser,
    resetTargetUser,
    searchFilter,
    roleFilter,
    isActiveFilter,
    showingStart,
    showingEnd,
    openDeleteModal,
    cancelDelete,
    performDelete,
    openResetModal,
    cancelReset,
    performReset,
    nextPage,
    prevPage,
    toggleRow,
    getRowNumber,
  };
};
