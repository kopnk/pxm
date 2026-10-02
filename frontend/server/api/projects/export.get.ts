import { defineEventHandler, getQuery, createError } from "h3";
import {
  buildProjectsExportAoa,
  type ProjectListExportRow,
} from "~/server/utils/buildProjectsExportAoa";
import { exportFileDateLabel } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { firstQuery } from "~/server/utils/firstQuery";
import { projectsExportQueryZ } from "~/server/validation/projects.schema";
import { listProjectRecords } from "~/server/utils/projectStore";
import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
    regionId: firstQuery(raw.regionId),
    subRegionId: firstQuery(raw.subRegionId),
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
  const records = await listProjectRecords({
    search: q.search,
    status: q.status,
  });
  const projectIds = q.regionId || q.subRegionId
    ? new Set((await listProjectDetailRecords({ regionId: q.regionId, subRegionId: q.subRegionId })).map((detail) => detail.projectId))
    : null;
  const filteredRecords = projectIds
    ? records.filter((record) => projectIds.has(record.id))
    : records;

  const total = filteredRecords.length;
  const { page, limit, offset } = buildPagination(q);

  const exportRows: ProjectListExportRow[] = filteredRecords
    .slice(offset, offset + limit)
    .map((row) => ({
      projectName: row.projectName,
      contractNumber: row.contractNumber,
      prScNumber: row.prScNumber,
      poNumber: row.poNumber,
      poDate: row.poDate,
      deliveryDate: row.deliveryDate,
      komDate: row.komDate,
      pm: row.pm,
      clientName: row.clientName,
      subTotal: row.subTotal,
      discount: row.discount,
      netPrice: row.netPrice,
      vatAmount: row.vatAmount,
      grandTotal: row.grandTotal,
    }));

  const matrix = buildProjectsExportAoa(exportRows);
  const dateLabel = exportFileDateLabel();

  return successResponse(event, "Projects export matrix ready", {
    matrix,
    suggestedFileName: `projects-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      total,
      totalPages: buildTotalPages(total, limit),
      exportedLines: exportRows.length,
    },
  });
});
