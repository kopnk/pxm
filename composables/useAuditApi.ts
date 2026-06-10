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
] as const;

export type AuditActionOption = (typeof AUDIT_ACTION_OPTIONS)[number];

export const useAuditApi = () => {
  const store = useAuditStore();

  const getAuditLogs = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    actorId?: string;
    action?: string;
    targetTable?: string;
  }) => {
    store.setLoading(true);
    try {
      const query: Record<string, string | number> = {
        page: params?.page ?? 1,
        limit: params?.limit ?? DEFAULT_PAGE_LIMIT,
      };

      if (params?.search) query.search = params.search;
      if (params?.actorId) query.actorId = params.actorId;
      if (params?.action) query.action = params.action;
      if (params?.targetTable) query.targetTable = params.targetTable;

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
