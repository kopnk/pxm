import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { listRegionRecords } from "~/server/utils/regionStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listRegionRecords({
    search: String(query.search ?? query.q ?? "").trim() || undefined,
    type: query.type ? String(query.type) : undefined,
    parentId: query.parentId ? String(query.parentId) : undefined,
    regionId: query.regionId ? String(query.regionId) : undefined,
    subRegionId: query.subRegionId ? String(query.subRegionId) : undefined,
    cityKabId: query.cityKabId ? String(query.cityKabId) : undefined,
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const items = records.slice(offset, offset + limit).map((record) => ({
    ...record,
    createdAt: toLocalTime(record.createdAt),
    updatedAt: toLocalTime(record.updatedAt),
  }));

  return successResponse(event, "Regions retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
