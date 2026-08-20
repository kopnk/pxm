import { defineEventHandler, getQuery, createError } from "h3";
import { requireRole } from "~/server/utils/authorize";
import {
  buildProjectFinancialsExportAoa,
  type ProjectFinancialExportRow,
} from "~/server/utils/buildProjectFinancialsExportAoa";
import {
  mergeProjectFinancialsExportByDetail,
  paginateMergedExportRows,
} from "~/server/utils/mergeProjectFinancialsExportByDetail";
import { projectFinancialsExportQueryZ } from "~/server/validation/project_financials.schema";
import { exportFileDateLabel, toLocalDate } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { firstQuery } from "~/server/utils/firstQuery";
import { buildPagination } from "~/lib/pagination";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

const MAX_EXPORT_MERGED_ROWS = 8000;

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectFinancialsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
    projectId: firstQuery(raw.projectId),
    projectDetailId: firstQuery(raw.projectDetailId),
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
  const records = await listProjectFinancialRecords({
    projectId: q.projectId,
    projectDetailId: q.projectDetailId,
    search: q.search,
    status: q.status,
  });
  const mergedAll = mergeProjectFinancialsExportByDetail(
    records.map((row) => ({
      projectDetailId: row.projectDetailId,
      createdAt: row.createdAt,
      flowDirection: row.flowDirection,
      status: row.status,
      note: row.note,
      taxIn: row.taxIn,
      taxOut: row.taxOut,
      pph: row.pph,
      qtyPartner: row.qtyPartner,
      unitPricePartner: row.unitPricePartner,
      qtyClient: row.qtyClient,
      unitPriceClient: row.unitPriceClient,
      poNumberPartner: row.poNumberPartner,
      poDatePartner: row.poDatePartner,
      invoiceNumberPartner: row.invoiceNumberPartner,
      invoiceDatePartner: row.invoiceDatePartner,
      poNumberClient: row.poNumberClient,
      poDateClient: row.poDateClient,
      invoiceNumberClient: row.invoiceNumberClient,
      invoiceDateClient: row.invoiceDateClient,
      fpNumberClient: row.fpNumberClient,
      fpDateClient: row.fpDateClient,
      balapNumber: row.balapNumber,
      balapDate: row.balapDate,
      bastNumber: row.bastNumber,
      bastDate: row.bastDate,
      vbNumber: row.vbNumber,
      vbDate: row.vbDate,
      mcmNumber: row.mcmNumber,
      mcmDate: row.mcmDate,
      paidNumber: row.paidNumber,
      paidDate: row.paidDate,
      contractNumber: row.contractNumber,
      projectPoNumber: row.projectPoNumber,
      poDate: row.poDate,
      deliveryDate: row.deliveryDate,
      komDate: row.komDate,
      projectName: row.projectName,
      pm: row.pm,
      materialId: row.detailMaterialId,
      materialName: row.detailMaterialName,
      lineNumber: row.detailLineNumber,
      neId: row.detailNeId,
      systemkey: row.detailSystemkey,
      siteId: row.detailSiteId,
      siteName: row.detailSiteName,
      quantity: row.detailQuantity,
      uom: row.detailUom,
      unitPrice: row.detailUnitPrice,
      totalPrice: row.detailTotalPrice,
      detailStatus: row.detailStatus,
      picArea: row.detailPicArea,
      remarksProjectsDetails: row.remarksProjectsDetails,
      remarksDelay: row.remarksDelay,
      remarksCancel: row.remarksCancel,
      clientName: row.clientName,
      regionName: row.regionName,
      subRegionName: row.subRegionName,
      cityKabName: row.cityKabName,
    })) as ProjectFinancialExportRow[],
  );

  if (mergedAll.length > MAX_EXPORT_MERGED_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many project detail lines (${mergedAll.length}). Narrow search or status filter (max ${MAX_EXPORT_MERGED_ROWS}).`,
    });
  }

  const { page, limit } = buildPagination(q);
  const mergedPage = paginateMergedExportRows(mergedAll, page, limit);

  const matrix = buildProjectFinancialsExportAoa(mergedPage);
  const dateLabel = exportFileDateLabel();

  return successResponse(event, "Project financials export matrix ready", {
    matrix,
    suggestedFileName: `project-financials-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      totalMergedLines: mergedAll.length,
      exportedLines: mergedPage.length,
    },
  });
});
