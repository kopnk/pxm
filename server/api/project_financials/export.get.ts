import { defineEventHandler, getQuery, createError } from "h3";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { clients } from "~/server/db/schema/clients";
import { partners } from "~/server/db/schema/partners";
import { regions } from "~/server/db/schema/regions";
import { requireRole } from "~/server/utils/authorize";
import { buildProjectFinancialsListWhere } from "~/server/utils/projectFinancialsListWhere";
import {
  buildProjectFinancialsExportAoa,
  type ProjectFinancialExportRow,
} from "~/server/utils/buildProjectFinancialsExportAoa";
import {
  mergeProjectFinancialsExportByDetail,
  paginateMergedExportRows,
} from "~/server/utils/mergeProjectFinancialsExportByDetail";
import { projectFinancialsExportQueryZ } from "~/server/validation/project_financials.schema";
import { toLocalDate } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { firstQuery } from "~/server/utils/firstQuery";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

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
  const where = buildProjectFinancialsListWhere({
    projectId: q.projectId,
    projectDetailId: q.projectDetailId,
    search: q.search,
    status: q.status,
  });

  const city = alias(regions, "pf_export_city");
  const sub = alias(regions, "pf_export_sub");
  const region = alias(regions, "pf_export_region");

  const rows = await db
    .select({
      projectDetailId: projectFinancials.projectDetailId,
      createdAt: projectFinancials.createdAt,
      flowDirection: projectFinancials.flowDirection,
      status: projectFinancials.status,
      note: projectFinancials.note,
      taxIn: projectFinancials.taxIn,
      taxOut: projectFinancials.taxOut,
      pph: projectFinancials.pph,
      qtyPartner: projectFinancials.qtyPartner,
      unitPricePartner: projectFinancials.unitPricePartner,
      qtyClient: projectFinancials.qtyClient,
      unitPriceClient: projectFinancials.unitPriceClient,
      poNumberPartner: projectFinancials.poNumberPartner,
      poDatePartner: projectFinancials.poDatePartner,
      invoiceNumberPartner: projectFinancials.invoiceNumberPartner,
      invoiceDatePartner: projectFinancials.invoiceDatePartner,
      poNumberClient: projectFinancials.poNumberClient,
      poDateClient: projectFinancials.poDateClient,
      invoiceNumberClient: projectFinancials.invoiceNumberClient,
      invoiceDateClient: projectFinancials.invoiceDateClient,
      fpNumberClient: projectFinancials.fpNumberClient,
      fpDateClient: projectFinancials.fpDateClient,
      balapNumber: projectFinancials.balapNumber,
      balapDate: projectFinancials.balapDate,
      bastNumber: projectFinancials.bastNumber,
      bastDate: projectFinancials.bastDate,
      vbNumber: projectFinancials.vbNumber,
      vbDate: projectFinancials.vbDate,
      mcmNumber: projectFinancials.mcmNumber,
      mcmDate: projectFinancials.mcmDate,
      paidNumber: projectFinancials.paidNumber,
      paidDate: projectFinancials.paidDate,
      contractNumber: projects.contractNumber,
      projectPoNumber: projects.poNumber,
      poDate: projects.poDate,
      deliveryDate: projects.deliveryDate,
      komDate: projects.komDate,
      projectName: projects.projectName,
      pm: projects.pm,
      materialId: projectDetails.materialId,
      materialName: projectDetails.materialName,
      lineNumber: projectDetails.lineNumber,
      neId: projectDetails.neId,
      systemkey: projectDetails.systemkey,
      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,
      quantity: projectDetails.quantity,
      uom: projectDetails.uom,
      unitPrice: projectDetails.unitPrice,
      totalPrice: projectDetails.totalPrice,
      detailStatus: projectDetails.status,
      picArea: projectDetails.picArea,
      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksDelay: projectDetails.remarksDelay,
      remarksCancel: projectDetails.remarksCancel,
      clientName: clients.name,
      regionName: region.name,
      subRegionName: sub.name,
      cityKabName: city.name,
    })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where)
    .orderBy(desc(projectFinancials.createdAt), desc(projectFinancials.id));

  const mergedAll = mergeProjectFinancialsExportByDetail(
    rows as ProjectFinancialExportRow[],
  );

  if (mergedAll.length > MAX_EXPORT_MERGED_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many project detail lines (${mergedAll.length}). Narrow search or status filter (max ${MAX_EXPORT_MERGED_ROWS}).`,
    });
  }

  const page = q.page ?? 1;
  const limit = q.limit ?? DEFAULT_PAGE_LIMIT;
  const mergedPage = paginateMergedExportRows(mergedAll, page, limit);

  const matrix = buildProjectFinancialsExportAoa(mergedPage);
  const dateLabel = toLocalDate(Date.now()) ?? "export";

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
