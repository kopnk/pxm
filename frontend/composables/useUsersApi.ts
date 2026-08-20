import { apiFetch } from "~/utils/apiFetch";
import type { ApiSuccessEnvelope } from "~/lib/apiEnvelope";
import type { User } from "~/stores/users";

type UsersListData = {
  items: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const useUsersApi = () => {
  const usersStore = useUsersStore();

  const getUsers = async (params?: { page?: number; limit?: number }) => {
    usersStore.setLoading(true);
    try {
      const isActive = usersStore.filters.isActive;
      const res = await apiFetch<ApiSuccessEnvelope<UsersListData>>("/api/users", {
        query: {
          page: params?.page ?? usersStore.meta.page,
          limit: params?.limit ?? usersStore.meta.limit,
          search: usersStore.filters.search || undefined,
          role: usersStore.filters.role || undefined,
          isActive:
            isActive === ""
              ? undefined
              : isActive === "true",
        },
      });

      const d = res.data;
      usersStore.setUsers(d.items, {
        page: d.page,
        limit: d.limit,
        total: d.total,
        totalPages: d.totalPages,
      });
    } finally {
      usersStore.setLoading(false);
    }
  };

  const getUserById = async (id: string) => {
    const res = await apiFetch<ApiSuccessEnvelope<User>>(`/api/users/${id}`);
    return res.data;
  };

  const signupUser = async (payload: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    region: string;
    area: string;
    role: string;
    isActive?: boolean;
    avatarUrl?: string;
  }) => {
    return apiFetch("/api/users/signup", {
      method: "POST",
      body: payload,
    });
  };

  const updateUser = async (id: string, payload: Partial<User>) => {
    await apiFetch(`/api/users/${id}`, {
      method: "PUT",
      body: payload,
    });
  };

  const deleteUser = async (id: string) => {
    await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    usersStore.removeUser(id);
  };

  const resetUserPassword = async (id: string) => {
    return apiFetch<
      ApiSuccessEnvelope<{
        id: string;
        mustChangePassword: boolean;
      }>
    >(`/api/users/${id}/reset-password`, { method: "POST" });
  };

  return {
    getUsers,
    getUserById,
    signupUser,
    updateUser,
    deleteUser,
    resetUserPassword,
  };
};
