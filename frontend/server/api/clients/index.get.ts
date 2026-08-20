import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { toLocalTime } from "~/server/utils/datetime";
import { listClientRecords } from "~/server/utils/clientStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listClientRecords({
    search: query.search ? String(query.search) : undefined,
    isActive:
      query.isActive === undefined
        ? undefined
        : query.isActive === "true",
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    createdAt: toLocalTime(record.createdAt),
    updatedAt: toLocalTime(record.updatedAt),
  }));

  return successResponse(event, "Clients retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
