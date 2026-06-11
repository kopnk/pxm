import { useAuditStore, type AuditLogItem } from "@/stores/audit";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { apiFetch } from "~/utils/apiFetch";

export const AUDIT_ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "CHANGE_PASSWORD",
  "RESET_PASSWORD",
] as const;

export type AuditActionOption = (typeof AUDIT_ACTION_OPTIONS)[number];

export const useAuditApi = () => {
  const store = useAuditStore();

  const getAuditLogs = async (params?: {
    page?: number;
    limit?: number;
    actorId?: string;
  }) => {
    store.setLoading(true);
    try {
      const query: Record<string, string | number> = {
        page: params?.page ?? store.page,
        limit: params?.limit ?? store.limit ?? DEFAULT_PAGE_LIMIT,
      };

      if (store.filters.search) query.search = store.filters.search;
      if (params?.actorId) query.actorId = params.actorId;
      if (store.filters.action) query.action = store.filters.action;
      if (store.filters.targetTable) query.targetTable = store.filters.targetTable;

      const res: any = await apiFetch("/api/audit", { query });
      store.setAuditList(res.data);
      return res.data as {
        items: AuditLogItem[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    } finally {
      store.setLoading(false);
    }
  };

  const bulkDeleteAuditLogs = async (ids: string[]) => {
    const res: any = await apiFetch("/api/audit/bulk-delete", {
      method: "POST",
      body: { ids },
    });
    return res.data as { deletedCount: number };
  };

  return {
    store,
    getAuditLogs,
    bulkDeleteAuditLogs,
  };
};
