import { apiFetch } from "~/utils/apiFetch";
import type { User } from "~/stores/users";

type UsersListData = {
  items: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export const useUsersApi = () => {
  const usersStore = useUsersStore();

  const getUsers = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) => {
    usersStore.setLoading(true);
    try {
      const res = await apiFetch<ApiEnvelope<UsersListData>>("/api/users", {
        query: params,
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
    const res = await apiFetch<ApiEnvelope<User>>(`/api/users/${id}`);
    return res.data;
  };

  const signupUser = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    region?: string;
    area?: string;
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

  return {
    getUsers,
    getUserById,
    signupUser,
    updateUser,
    deleteUser,
  };
};
