import type { User } from "~/stores/users";

interface UsersResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: User[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export const useUsersApi = () => {
  const usersStore = useUsersStore();

  /**
   * GET users
   */
  const getUsers = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) => {
    usersStore.loading = true;

    const { data, error } = await useFetch<UsersResponse>("/api/users", {
      query: params,
      key: `users-${JSON.stringify(params)}-${Date.now()}`,
    });

    if (error.value) {
      usersStore.loading = false;
      throw error.value;
    }

    if (data.value) {
      usersStore.setUsers(
        data.value.data.items,
        data.value.data.meta
      );
    }

    usersStore.loading = false;
  };

  /**
   * GET user by id
   */
  const getUserById = async (id: string) => {
    const { data, error } = await useFetch(`/api/users/${id}`);
    if (error.value) throw error.value;
    return data.value?.data;
  };

  /**
   * SIGNUP user (🔥 IMPORTANT: $fetch)
   */
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
    console.log("🟠 [API] signupUser payload:", payload);

    try {
      const res = await $fetch("/api/users/signup", {
        method: "POST",
        body: payload,
      });

      console.log("🟢 [API] signupUser success:", res);
      return res;
    } catch (err) {
      console.error("🔴 [API] signupUser error:", err);
      throw err;
    }
  };

  /**
   * UPDATE user
   */
  const updateUser = async (
    id: string,
    payload: Partial<User>
  ) => {
    const { error } = await useFetch(`/api/users/${id}`, {
      method: "PUT",
      body: payload,
    });

    if (error.value) throw error.value;
  };

  /**
   * DELETE user
   */
  const deleteUser = async (id: string) => {
    const { error } = await useFetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    if (error.value) throw error.value;

    usersStore.items = usersStore.items.filter(
      (u) => u.id !== id
    );

    if (usersStore.meta) {
      usersStore.meta.total -= 1;
    }
  };

  return {
    getUsers,
    getUserById,
    signupUser,
    updateUser,
    deleteUser,
  };
};
