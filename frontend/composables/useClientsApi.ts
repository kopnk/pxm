import { useClientsStore } from "@/stores/clients";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { apiFetch } from "~/utils/apiFetch";

export type ClientPayload = {
  name: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
  addressText?: string;
  addressMeta?: {
    province?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  isActive?: boolean;
};

export const useClientsApi = () => {
  const store = useClientsStore();

  const getClients = async (params?: {
    page?: number;
    limit?: number;
  }) => {
    store.setLoading(true);

    try {
      const isActive = store.filters.isActive;
      const query: Record<string, string | number | boolean> = {
        page: params?.page ?? store.page,
        limit: params?.limit ?? store.limit ?? DEFAULT_PAGE_LIMIT,
      };

      if (store.filters.search) query.search = store.filters.search;
      if (isActive !== "") query.isActive = isActive === "true";

      const res: any = await apiFetch("/api/clients", {
        query,
      });

      // ✅ Ikut style store
      store.setClients(res.data);
    } finally {
      store.setLoading(false);
    }
  };

  const getClientById = async (id: string) => {
    const res: any = await apiFetch(`/api/clients/${id}`);
    return res.data;
  };

  const createClient = async (payload: ClientPayload) => {
    const res: any = await apiFetch("/api/clients", {
      method: "POST",
      body: payload,
    });

    return res.data;
  };

  const updateClient = async (id: string, payload: Partial<ClientPayload>) => {
    const res: any = await apiFetch(`/api/clients/${id}`, {
      method: "PUT",
      body: payload,
    });

    store.updateClientInList(res.data);

    return res.data;
  };

  const deleteClient = async (id: string) => {
    await apiFetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    store.removeClient(id);
  };

  return {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
  };
};