import { computed, onMounted, ref } from "vue";
import {
  RLS_ACTIONS,
  RLS_MENU_REGISTRY,
  type RlsAction,
  type RlsResource,
} from "~/lib/rls";
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

  const search = ref("");
  const role = ref("");
  const isActive = ref("");
  const menuSearch = ref("");
  const actionFilter = ref<"" | RlsAction>("");

  const filteredUsers = computed(() => {
    const q = search.value.trim().toLowerCase();

    return store.users.filter((user) => {
      if (role.value && user.role?.toLowerCase() !== role.value) {
        return false;
      }

      if (isActive.value !== "") {
        const active = isActive.value === "true";
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
    const q = menuSearch.value.trim().toLowerCase();
    if (!q) return [...RLS_MENU_REGISTRY];

    return RLS_MENU_REGISTRY.filter(
      (menu) =>
        menu.label.toLowerCase().includes(q) ||
        menu.key.toLowerCase().includes(q),
    );
  });

  const visibleActions = computed(() => {
    if (!actionFilter.value) return [...RLS_ACTIONS];
    return [actionFilter.value];
  });

  const tableRows = computed(() => {
    const rows: Array<{
      userId: string;
      email: string;
      role: string;
      action: RlsAction;
      rowSpan: number;
      showUser: boolean;
    }> = [];

    const actions = visibleActions.value;

    for (const user of filteredUsers.value) {
      actions.forEach((action, actionIndex) => {
        rows.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          action,
          rowSpan: actions.length,
          showUser: actionIndex === 0,
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
      Boolean(search.value.trim()) ||
      Boolean(role.value) ||
      isActive.value !== "" ||
      Boolean(menuSearch.value.trim()) ||
      Boolean(actionFilter.value),
  );

  onMounted(() => {
    void getRlsMatrix();
  });

  return {
    store,
    search,
    role,
    isActive,
    menuSearch,
    actionFilter,
    filteredUsers,
    visibleMenus,
    visibleActions,
    tableRows,
    hasActiveFilters,
    isChecked,
    onToggle,
  };
};
