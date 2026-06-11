import { useRegionMasterStore, type RegionType } from "@/stores/regionMaster";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { apiFetch } from "~/utils/apiFetch";

export type RegionPayload = {
  name: string;
  type: RegionType;
  parentId?: string | null;
};

export const useRegionMasterApi = () => {
  const store = useRegionMasterStore();

  const getRegions = async (params?: {
    page?: number;
    limit?: number;
    parentId?: string;
  }) => {
    store.setLoading(true);

    try {
      const res: any = await apiFetch("/api/regions", {
        query: {
          page: params?.page ?? store.page,
          limit: params?.limit ?? store.limit ?? DEFAULT_PAGE_LIMIT,
          search: store.filters.search || undefined,
          type: store.filters.type || undefined,
          parentId: params?.parentId || undefined,
        },
      });

      const data = res.data ?? {};
      const total = Number(data.total ?? 0);
      const limit = Number(data.limit ?? store.limit) || store.limit;
      const page = Number(data.page ?? store.page) || 1;
      const totalPages =
        typeof data.totalPages === "number" && data.totalPages > 0
          ? data.totalPages
          : Math.max(1, Math.ceil(total / limit));

      store.setList({
        items: data.items ?? [],
        page,
        limit,
        total,
        totalPages,
      });
    } finally {
      store.setLoading(false);
    }
  };

  const getRegionById = async (id: string) => {
    const res: any = await apiFetch(`/api/regions/${id}`);
    return res.data;
  };

  const getParentOptions = async (type: RegionType) => {
    const parentType: RegionType | null =
      type === "sub_region"
        ? "region"
        : type === "city_kab"
          ? "sub_region"
          : null;
    if (!parentType) return [] as { id: string; name: string }[];

    const res: any = await apiFetch("/api/regions/parent-options", {
      query: { type: parentType },
    });

    return (res.data?.items ?? []) as { id: string; name: string }[];
  };

  const createRegion = async (payload: RegionPayload) => {
    const res: any = await apiFetch("/api/regions", {
      method: "POST",
      body: payload,
    });
    return res.data;
  };

  const updateRegion = async (id: string, payload: Partial<RegionPayload>) => {
    const res: any = await apiFetch(`/api/regions/${id}`, {
      method: "PUT",
      body: payload,
    });
    return res.data;
  };

  const deleteRegion = async (id: string) => {
    await apiFetch(`/api/regions/${id}`, {
      method: "DELETE",
    });
    store.removeItem(id);
  };

  return {
    getRegions,
    getRegionById,
    getParentOptions,
    createRegion,
    updateRegion,
    deleteRegion,
  };
};
