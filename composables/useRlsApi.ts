import type { RlsMatrix } from "~/lib/rls";
import { apiFetch } from "~/utils/apiFetch";
import { useRlsStore, type RlsUserRow } from "@/stores/rls";

export const useRlsApi = () => {
  const store = useRlsStore();

  const getRlsMatrix = async () => {
    store.setLoading(true);
    try {
      const res = await apiFetch<{ data: { users: RlsUserRow[] } }>("/api/rls");
      store.setUsers(res.data.users);
      return res.data.users;
    } finally {
      store.setLoading(false);
    }
  };

  const updateUserPermissions = async (userId: string, permissions: RlsMatrix) => {
    const res = await apiFetch<{ data: RlsUserRow }>(`/api/rls/${userId}`, {
      method: "PUT",
      body: { permissions },
    });
    store.updateUser(res.data);
    return res.data;
  };

  return { store, getRlsMatrix, updateUserPermissions };
};
