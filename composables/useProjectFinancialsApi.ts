// composables/useProjectFinancialsApi.ts
import { useProjectFinancialsStore } from "@/stores/projectFinancials";
import { apiFetch } from "~/utils/apiFetch";

export const useProjectFinancialsApi = () => {
  const store = useProjectFinancialsStore();

  const getProjectFinancials = async (params?: {
    page?: number;
    limit?: number;
    projectId?: string;
    projectDetailId?: string;
    search?: string;
    status?: string;
  }) => {
    store.setLoading(true);

    try {
      const res: any = await apiFetch("/api/project_financials", {
        query: {
          page: params?.page ?? store.page,
          limit: params?.limit ?? store.limit,
          projectId: params?.projectId,
          projectDetailId: params?.projectDetailId,
          search: params?.search,
          status: params?.status,
        },
      });

      const t = res.data.totals;
      const pickSection = (raw: unknown) => {
        const obj =
          raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
        return {
          dppIdr: Number(obj?.dppIdr) || 0,
          taxIdr: Number(obj?.taxIdr) || 0,
        };
      };
      store.setProjectFinancials({
        items: res.data.items,
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        totalPages: res.data.totalPages,
        listTotals:
          t && typeof t === "object"
            ? {
                partnerLineIdr: Number(t.partnerLineIdr) || 0,
                clientLineIdr: Number(t.clientLineIdr) || 0,
                taxInSection: pickSection(t.taxInSection),
                taxOutSection: pickSection(t.taxOutSection),
                pphSection: pickSection(t.pphSection),
              }
            : undefined,
      });

    } finally {
      store.setLoading(false);
    }
  };

  const getProjectFinancialById = (id: string) =>
    apiFetch(`/api/project_financials/${id}`);

  const createProjectFinancial = (payload: any) =>
    apiFetch("/api/project_financials", {
      method: "POST",
      body: payload,
    });

  const updateProjectFinancial = (id: string, payload: any) =>
    apiFetch(`/api/project_financials/${id}`, {
      method: "PUT",
      body: payload,
    });

  const deleteProjectFinancial = async (id: string) => {
    await apiFetch(`/api/project_financials/${id}`, {
      method: "DELETE",
    });

    // optional: remove from store without refetch
    store.setItems(store.items.filter((i) => i.id !== id));
  };

  return {
    getProjectFinancials,
    getProjectFinancialById,
    createProjectFinancial,
    updateProjectFinancial,
    deleteProjectFinancial,
  };
};