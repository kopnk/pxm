import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { toLocalTime } from "~/server/utils/datetime";
import { listProjectRecords } from "~/server/utils/projectStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listProjectRecords({
    search: query.search ? String(query.search) : undefined,
    status: query.status ? String(query.status) : undefined,
  });
  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const listTotalPoPrice = records.reduce(
    (sum, record) => sum + Number(record.subTotal || 0),
    0,
  );
  const listTotalDpp = records.reduce(
    (sum, record) => sum + Number(record.dpp || 0),
    0,
  );
  const listTotalHpp = records.reduce(
    (sum, record) => sum + Number(record.hpp || 0),
    0,
  );
  const listTotalMrg = listTotalDpp > 0
    ? ((listTotalDpp - listTotalHpp) / listTotalDpp) * 100
    : 0;
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    createdAt: toLocalTime(record.createdAt),
    updatedAt: toLocalTime(record.updatedAt),
  }));

  return successResponse(event, "Projects retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
    listTotalPoPrice,
    listTotalDpp,
    listTotalHpp,
    listTotalMrg,
  });

});
