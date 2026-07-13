import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { listAuditLogs } from "~/server/utils/auditStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const records = await listAuditLogs({
    search: query.search?.toString(),
    actorId: query.actorId?.toString(),
    action: query.action?.toString(),
    targetTable: query.targetTable?.toString(),
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    createdAt: toLocalTime(record.createdAt),
  }));

  return successResponse(event, "Audit logs retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
