import { computed, onMounted, ref } from "vue";
import {
  RLS_ACTIONS,
  RLS_MENU_REGISTRY,
  type RlsAction,
  type RlsResource,
} from "~/lib/rls";
import { canManageUserInList } from "~/lib/userRoles";
import { useRlsApi } from "@/composables/useRlsApi";
import { useNotify } from "@/composables/useNotify";

export const RLS_ACTION_LABELS: Record<RlsAction, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
};

export const useRlsListPage = () => {
  const { store, getRlsMatrix, updateUserPermissions } = useRlsApi();
  const notify = useNotify();

  const searchFilter = computed({
    get: () => store.filters.search,
    set: (value: string) => store.setFilters({ search: value }),
  });

  const roleFilter = computed({
    get: () => store.filters.role,
    set: (value: string) => store.setFilters({ role: value }),
  });

  const isActiveFilter = computed({
    get: () => store.filters.isActive,
    set: (value: "" | "true" | "false") => store.setFilters({ isActive: value }),
  });

  const menuSearchFilter = computed({
    get: () => store.filters.menuSearch,
    set: (value: string) => store.setFilters({ menuSearch: value }),
  });

  const actionFilter = computed({
    get: () => store.filters.actionFilter,
    set: (value: "" | RlsAction) => store.setFilters({ actionFilter: value }),
  });

  const canEditUserRls = (role?: string | null) => canManageUserInList(role);

  const filteredUsers = computed(() => {
    const q = store.filters.search.trim().toLowerCase();

    return store.users.filter((user) => {
      if (!canEditUserRls(user.role)) return false;

      if (store.filters.role && user.role?.toLowerCase() !== store.filters.role) {
        return false;
      }

      if (store.filters.isActive !== "") {
        const active = store.filters.isActive === "true";
        if (Boolean(user.isActive) !== active) return false;
      }

      if (!q) return true;

      const haystack = [
        user.email,
        user.firstName,
        user.lastName,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  });

  const visibleMenus = computed(() => {
    const q = store.filters.menuSearch.trim().toLowerCase();
    if (!q) return [...RLS_MENU_REGISTRY];

    return RLS_MENU_REGISTRY.filter(
      (menu) =>
        menu.label.toLowerCase().includes(q) ||
        menu.key.toLowerCase().includes(q),
    );
  });

  const visibleActions = computed(() => {
    if (!store.filters.actionFilter) return [...RLS_ACTIONS];
    return [store.filters.actionFilter];
  });

  const tableRows = computed(() => {
    const rows: Array<{
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      action: RlsAction;
      rowSpan: number;
      showUser: boolean;
      userIndex: number;
    }> = [];

    const actions = visibleActions.value;

    for (const [userIndex, user] of filteredUsers.value.entries()) {
      actions.forEach((action, actionIndex) => {
        rows.push({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          action,
          rowSpan: actions.length,
          showUser: actionIndex === 0,
          userIndex,
        });
      });
    }

    return rows;
  });

  const isChecked = (
    userId: string,
    resource: RlsResource,
    action: RlsAction,
  ) => {
    const user = store.users.find((row) => row.id === userId);
    return Boolean(user?.permissions?.[resource]?.[action]);
  };

  const onToggle = async (
    userId: string,
    resource: RlsResource,
    action: RlsAction,
    event: Event,
  ) => {
    const user = store.users.find((row) => row.id === userId);
    if (!user) return;

    if (!canEditUserRls(user.role)) {
      const input = event.target as HTMLInputElement;
      input.checked = !input.checked;
      notify.warning("Superadmin permissions cannot be modified");
      return;
    }

    const input = event.target as HTMLInputElement;
    const nextValue = input.checked;

    store.setUserPermission(userId, resource, action, nextValue);
    store.setSavingUserId(userId);

    try {
      await updateUserPermissions(userId, user.permissions);
      notify.success("Permissions updated");
    } catch (error: unknown) {
      store.setUserPermission(userId, resource, action, !nextValue);
      input.checked = !nextValue;
      notify.error("Failed to update permissions");
      console.error(error);
    } finally {
      store.setSavingUserId(null);
    }
  };

  const hasActiveFilters = computed(
    () =>
      Boolean(store.filters.search.trim()) ||
      Boolean(store.filters.role) ||
      store.filters.isActive !== "" ||
      Boolean(store.filters.menuSearch.trim()) ||
      Boolean(store.filters.actionFilter),
  );

  onMounted(() => {
    void getRlsMatrix();
  });

  return {
    store,
    searchFilter,
    roleFilter,
    isActiveFilter,
    menuSearchFilter,
    actionFilter,
    filteredUsers,
    visibleMenus,
    visibleActions,
    tableRows,
    hasActiveFilters,
    canEditUserRls,
    isChecked,
    onToggle,
  };
};
