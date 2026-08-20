import { defineEventHandler, getQuery, createError } from "h3";
import { requireRole } from "~/server/utils/authorize";
import {
  buildProjectDetailsExportAoa,
  type ProjectDetailExportRow,
} from "~/server/utils/buildProjectDetailsExportAoa";
import { projectDetailsExportQueryZ } from "~/server/validation/project_details.schema";
import { exportFileDateLabel } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { firstQuery } from "~/server/utils/firstQuery";
import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectDetailsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    projectId: firstQuery(raw.projectId),
    status: firstQuery(raw.status),
    cityKabId: firstQuery(raw.cityKabId),
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
  const records = await listProjectDetailRecords({
    search: q.search,
    projectId: q.projectId,
    status: q.status,
    cityKabId: q.cityKabId,
  });

  const total = records.length;
  const { page, limit, offset } = buildPagination(q);

  const exportRows: ProjectDetailExportRow[] = records
    .slice(offset, offset + limit)
    .map((row) => ({
      contractNumber: row.contractNumber,
      prScNumber: row.prScNumber,
      poNumber: row.poNumber,
      poDate: row.poDate,
      deliveryDate: row.deliveryDate,
      komDate: row.komDate,
      projectName: row.projectName,
      regionName: row.regionName,
      subRegionName: row.subRegionName,
      cityKabName: row.cityKabName,
      lineNumber: row.lineNumber,
      materialId: row.materialId,
      materialName: row.materialName,
      neId: row.neId,
      systemkey: row.systemkey,
      siteId: row.siteId,
      siteName: row.siteName,
      quantity: row.quantity,
      uom: row.uom,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      picArea: row.picArea,
      pm: row.pm,
      remarksProjectsDetails: row.remarksProjectsDetails,
      remarksDelay: row.remarksDelay,
      remarksCancel: row.remarksCancel,
      clientName: row.clientName,
      status: row.status,
    }));

  const matrix = buildProjectDetailsExportAoa(exportRows);
  const dateLabel = exportFileDateLabel();

  return successResponse(event, "Project details export matrix ready", {
    matrix,
    suggestedFileName: `project-details-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      total,
      totalPages: buildTotalPages(total, limit),
      exportedLines: exportRows.length,
    },
  });
});
