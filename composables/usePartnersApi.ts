import { usePartnersStore } from "@/stores/partners";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { apiFetch } from "~/utils/apiFetch";

export type PartnerPayload = {
  name: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
  partnerType?: string;
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
  rating?: number | null;
  isActive?: boolean;
};

export const usePartnersApi = () => {
  const store = usePartnersStore();

  const getPartners = async (params?: {
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

      const res: any = await apiFetch("/api/partners", { query });
      store.setPartners(res.data);
    } finally {
      store.setLoading(false);
    }
  };

  const getPartnerById = async (id: string) => {
    const res: any = await apiFetch(`/api/partners/${id}`);
    return res.data;
  };

  const createPartner = async (payload: PartnerPayload) => {
    return await apiFetch("/api/partners", {
      method: "POST",
      body: payload,
    });
  };

  const updatePartner = async (id: string, payload: Partial<PartnerPayload>) => {
    return await apiFetch(`/api/partners/${id}`, {
      method: "PUT",
      body: payload,
    });
  };

  const deletePartner = async (id: string) => {
    await apiFetch(`/api/partners/${id}`, {
      method: "DELETE",
    });
    store.removePartner(id);
  };

  return {
    getPartners,
    getPartnerById,
    createPartner,
    updatePartner,
    deletePartner,
  };
};
