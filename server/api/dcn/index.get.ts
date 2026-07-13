import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { listDcnRecords } from "~/server/utils/dcnStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const records = await listDcnRecords({
    search: query.search ? String(query.search) : undefined,
    flow: query.flow === "in" || query.flow === "out" ? query.flow : undefined,
    type: typeof query.type === "string" && query.type.trim() ? query.type.trim() : undefined,
    year:
      typeof query.year === "string" && /^\d{4}$/.test(query.year)
        ? Number(query.year)
        : undefined,
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    letterDate: toLocalDate(record.letterDate),
    createdAt: toLocalTime(record.createdAt),
    updatedAt: toLocalTime(record.updatedAt),
  }));

  return successResponse(event, "DCN records retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
