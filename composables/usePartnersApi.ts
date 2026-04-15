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
  const getPartners = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) => {
    return await apiFetch("/api/partners", {
      query: params,
    });
  };

  const getPartnerById = async (id: string) => {
    return await apiFetch(`/api/partners/${id}`);
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
    return await apiFetch(`/api/partners/${id}`, {
      method: "DELETE",
    });
  };

  return {
    getPartners,
    getPartnerById,
    createPartner,
    updatePartner,
    deletePartner,
  };
};
