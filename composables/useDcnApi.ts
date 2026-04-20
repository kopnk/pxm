import { useDcnStore, type DcnFlow, type DcnItem } from "@/stores/dcn";
import { apiFetch } from "~/utils/apiFetch";

type DcnPayload = {
  letterDate: string;
  number: string;
  type?: string | null;
  toAddress?: string | null;
  fromAddress?: string | null;
  subject?: string | null;
  flow: DcnFlow;
};

export const DCN_OUT_TYPE_OPTIONS = [
  { value: "01", label: "Nota Dinas" },
  { value: "02", label: "Surat External" },
  { value: "03", label: "Surat Keputusan" },
  { value: "04", label: "Surat Persetujuan" },
  { value: "05", label: "Surat Pernyataan" },
  { value: "06", label: "Surat Peringatan" },
  { value: "07", label: "Surat Pelepasan Aset/Hak" },
  { value: "08", label: "Surat Kuasa" },
  { value: "10", label: "MoU" },
  { value: "12", label: "Purchase Order" },
  { value: "13", label: "BAST" },
  { value: "14", label: "BALAP" },
  { value: "15", label: "Sertifikat" },
] as const;

export const useDcnApi = () => {
  const store = useDcnStore();

  const getDcns = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    flow?: DcnFlow;
    type?: string;
    year?: number;
  }) => {
    store.setLoading(true);
    try {
      const query: Record<string, string | number> = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
      };

      if (params?.search) query.search = params.search;
      if (params?.flow) query.flow = params.flow;
      if (params?.type) query.type = params.type;
      if (params?.year) query.year = params.year;

      const res: any = await apiFetch("/api/dcn", { query });
      store.setDcnList(res.data);
      return res.data as {
        items: DcnItem[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    } finally {
      store.setLoading(false);
    }
  };

  const getDcnById = async (id: string) => {
    const res: any = await apiFetch(`/api/dcn/${id}`);
    return res.data as DcnItem;
  };

  const createDcn = async (payload: DcnPayload) => {
    const res: any = await apiFetch("/api/dcn", {
      method: "POST",
      body: payload,
    });
    return res.data as DcnItem;
  };

  const updateDcn = async (id: string, payload: Partial<DcnPayload>) => {
    const res: any = await apiFetch(`/api/dcn/${id}`, {
      method: "PUT",
      body: payload,
    });
    store.updateItemInList(res.data);
    return res.data as DcnItem;
  };

  const deleteDcn = async (id: string) => {
    await apiFetch(`/api/dcn/${id}`, { method: "DELETE" });
    store.removeItem(id);
  };

  const getNextOutNumber = async (typeCode: string, letterDate: string) => {
    const res: any = await apiFetch("/api/dcn/next-number", {
      query: {
        type: typeCode,
        letterDate,
      },
    });
    return String(res?.data?.number ?? "");
  };

  return {
    store,
    getDcns,
    getDcnById,
    createDcn,
    updateDcn,
    deleteDcn,
    getNextOutNumber,
  };
};
