import { defineStore } from "pinia";
import type { RlsAction, RlsMatrix } from "~/lib/rls";

export type RlsUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  permissions: RlsMatrix;
};

export const useRlsStore = defineStore("rls", {
  state: () => ({
    users: [] as RlsUserRow[],
    loading: false,
    savingUserId: null as string | null,
    filters: {
      search: "",
      role: "",
      isActive: "" as "" | "true" | "false",
      menuSearch: "",
      actionFilter: "" as "" | RlsAction,
    },
  }),

  actions: {
    setLoading(value: boolean) {
      this.loading = value;
    },

    setFilters(
      filters: Partial<{
        search: string;
        role: string;
        isActive: "" | "true" | "false";
        menuSearch: string;
        actionFilter: "" | RlsAction;
      }>,
    ) {
      this.filters = { ...this.filters, ...filters };
    },

    setSavingUserId(userId: string | null) {
      this.savingUserId = userId;
    },

    setUsers(users: RlsUserRow[]) {
      this.users = users.map((user) => ({ ...user }));
    },

    updateUser(user: RlsUserRow) {
      const index = this.users.findIndex((row) => row.id === user.id);
      if (index === -1) return;
      this.users[index] = { ...user };
    },

    setUserPermission(
      userId: string,
      resource: keyof RlsMatrix,
      action: RlsAction,
      allowed: boolean,
    ) {
      const user = this.users.find((row) => row.id === userId);
      if (!user) return;
      user.permissions[resource][action] = allowed;
    },
  },
});
