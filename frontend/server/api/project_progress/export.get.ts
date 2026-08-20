import { createError, defineEventHandler, getQuery } from "h3";
import {
  buildProjectProgressExportAoa,
  type ProjectProgressExportRow,
} from "~/server/utils/buildProjectProgressExportAoa";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { projectProgressExportQueryZ } from "~/server/validation/project_progress.schema";
import { requireRole } from "~/server/utils/authorize";
import { exportFileDateLabel, toLocalDate } from "~/server/utils/datetime";
import { firstQuery } from "~/server/utils/firstQuery";
import { formatProjectProgressStageData } from "~/server/utils/projectProgressResponse";
import { listProjectProgressRecords } from "~/server/utils/projectProgressStore";
import { successResponse } from "~/server/utils/response";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectProgressExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    stage: firstQuery(raw.stage),
    stageDateType: firstQuery(raw.stageDateType),
    status: firstQuery(raw.status),
    project: firstQuery(raw.project),
    detail: firstQuery(raw.detail),
    page: firstQuery(raw.page),
    limit: firstQuery(raw.limit),
  });

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
    });
  }

  const q = parsed.data;
  const globalSearch = q.search;
  const records = await listProjectProgressRecords({
    search: globalSearch || undefined,
    project: globalSearch ? undefined : q.project,
    detail: globalSearch ? undefined : q.detail,
    stage: q.stage,
    stageDateType: q.stageDateType,
    status: q.status,
  });
  const total = records.length;
  const { page, limit, offset } = buildPagination(q);
  const rows = records.slice(offset, offset + limit);

  const exportRows: ProjectProgressExportRow[] = rows.map((row) => ({
    contractNumber: row.contractNumber,
    poNumber: row.poNumber,
    poDate: toLocalDate(row.poDate ?? null),
    deliveryDate: toLocalDate(row.deliveryDate ?? null),
    komDate: toLocalDate(row.komDate ?? null),
    projectName: row.projectName,
    regionName: row.regionName,
    subRegionName: row.subRegionName,
    cityKabName: row.cityKabName,
    materialId: row.materialId,
    materialName: row.materialName,
    lineNumber: row.lineNumber,
    neId: row.neId,
    systemkey: row.systemKey,
    siteId: row.siteId,
    siteName: row.siteName,
    picArea: row.picArea,
    remarksProjectsDetails: row.remarksProjectsDetails,
    remarksDelay: row.remarksDelay,
    partnerName: null,
    detailStatus: row.detailStatus,
    stageData: formatProjectProgressStageData(row.stageData),
  }));

  const matrix = buildProjectProgressExportAoa(exportRows);
  const dateLabel = exportFileDateLabel();

  return successResponse(event, "Project progress export matrix ready", {
    matrix,
    suggestedFileName: `project-progress-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      total,
      totalPages: buildTotalPages(total, limit),
      exportedLines: exportRows.length,
    },
  });
});
