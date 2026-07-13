import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listProjectDetailRecords({
    search: query.search ? String(query.search) : undefined,
    projectId: query.projectId ? String(query.projectId) : undefined,
    status: query.status ? String(query.status) : undefined,
    cityKabId: query.cityKabId ? String(query.cityKabId) : undefined,
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const listTotalPrice = records.reduce(
    (sum, record) => sum + Number(record.totalPrice || 0),
    0,
  );
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    createdAt: record.createdAt ? toLocalTime(record.createdAt) : null,
    updatedAt: record.updatedAt ? toLocalTime(record.updatedAt) : null,
  }));

  return successResponse(event, "Project details retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
    listTotalPrice,
  });
});
