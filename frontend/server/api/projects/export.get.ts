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

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
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

  const total = records.length;
  const { page, limit, offset } = buildPagination(q);

  const exportRows: ProjectListExportRow[] = records
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
