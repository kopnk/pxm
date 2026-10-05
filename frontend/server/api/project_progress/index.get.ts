import { defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import {
  computeStageCounts,
  listProjectProgressRecords,
} from "~/server/utils/projectProgressStore";
import { mapProjectProgressResponse } from "~/server/utils/projectProgressResponse";
import { successResponse } from "~/server/utils/response";
import { matchesMaterialName } from "~/server/utils/firstQuery";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const globalSearch = query.search?.toString().trim();
  const project = query.project?.toString().trim();
  const detail = query.detail?.toString().trim();
  const stageFilter = query.stage?.toString().trim();
  const stageDateType = query.stageDateType?.toString().trim();
  const statusFilter = query.status?.toString().trim();

  const records = await listProjectProgressRecords({
    search: globalSearch || undefined,
    project: globalSearch ? undefined : project || undefined,
    detail: globalSearch ? undefined : detail || undefined,
    stage: stageFilter || undefined,
    stageDateType:
      stageDateType === "planned" || stageDateType === "actual"
        ? stageDateType
        : undefined,
    status: statusFilter || undefined,
    regionId: query.regionId?.toString().trim() || undefined,
    subRegionId: query.subRegionId?.toString().trim() || undefined,
  });

  const installment = query.installment?.toString().trim();
  const installmentDetailIds = installment
    ? new Set((await listProjectFinancialRecords({ installment })).map((record) => record.projectDetailId))
    : null;
  const filteredRecords = records.filter((record) =>
    matchesMaterialName(record.materialName, query.material?.toString()) &&
    (!installmentDetailIds || installmentDetailIds.has(record.projectDetailId)),
  );
  const total = filteredRecords.length;
  const totalPages = buildTotalPages(total, limit);
  const stageCounts = computeStageCounts(filteredRecords);
  const items = filteredRecords
    .slice(offset, offset + limit)
    .map((record) => mapProjectProgressResponse(record));

  /* ================= RESPONSE ================= */

  return successResponse(event, "Project progress records retrieved", {
    items,
    stageCounts,
    page,
    limit,
    total,
    totalPages,
  });
});
