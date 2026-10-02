import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";
import { matchesMaterialName } from "~/server/utils/firstQuery";

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
    regionId: query.regionId ? String(query.regionId) : undefined,
    subRegionId: query.subRegionId ? String(query.subRegionId) : undefined,
  });

  const filteredRecords = records.filter((record) =>
    matchesMaterialName(record.materialName, query.material ? String(query.material) : undefined),
  );
  const total = filteredRecords.length;
  const totalPages = buildTotalPages(total, limit);
  const listTotalPrice = filteredRecords.reduce(
    (sum, record) => sum + Number(record.totalPrice || 0),
    0,
  );
  const items = filteredRecords.slice(offset, offset + limit).map((record) => ({
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
