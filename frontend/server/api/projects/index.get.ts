import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { toLocalTime } from "~/server/utils/datetime";
import { listProjectRecords } from "~/server/utils/projectStore";
import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listProjectRecords({
    search: query.search ? String(query.search) : undefined,
    status: query.status ? String(query.status) : undefined,
  });
  const regionId = query.regionId ? String(query.regionId) : undefined;
  const subRegionId = query.subRegionId ? String(query.subRegionId) : undefined;
  const installment = query.installment ? String(query.installment) : undefined;
  const projectIds = regionId || subRegionId
    ? new Set((await listProjectDetailRecords({ regionId, subRegionId })).map((detail) => detail.projectId))
    : null;
  const installmentProjectIds = installment
    ? new Set((await listProjectFinancialRecords({ installment })).map((record) => record.projectId))
    : null;
  const filteredRecords = projectIds
    ? records.filter((record) => projectIds.has(record.id) && (!installmentProjectIds || installmentProjectIds.has(record.id)))
    : installmentProjectIds
      ? records.filter((record) => installmentProjectIds.has(record.id))
      : records;
  const total = filteredRecords.length;
  const totalPages = buildTotalPages(total, limit);
  const listTotalPoPrice = filteredRecords.reduce(
    (sum, record) => sum + Number(record.subTotal || 0),
    0,
  );
  const listTotalDpp = filteredRecords.reduce(
    (sum, record) => sum + Number(record.dpp || 0),
    0,
  );
  const listTotalHpp = filteredRecords.reduce(
    (sum, record) => sum + Number(record.hpp || 0),
    0,
  );
  const listTotalMrg = listTotalDpp > 0
    ? ((listTotalDpp - listTotalHpp) / listTotalDpp) * 100
    : 0;
  const items = filteredRecords.slice(offset, offset + limit).map((record) => ({
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
