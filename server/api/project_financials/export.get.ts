import { defineEventHandler, getQuery, createError } from "h3";
import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq } from "drizzle-orm";
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
import { projectFinancialsExportQueryZ } from "~/server/validation/project_financials.schema";
import { toLocalDate } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";

const MAX_EXPORT_ROWS = 8000;

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  const x = Array.isArray(v) ? v[0] : v;
  const t = String(x).trim();
  return t === "" ? undefined : t;
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectFinancialsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
    projectId: firstQuery(raw.projectId),
    projectDetailId: firstQuery(raw.projectDetailId),
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

  const countRow = await db
    .select({ value: count() })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where);

  const total = Number(countRow[0]?.value ?? 0);
  if (total > MAX_EXPORT_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many rows (${total}). Narrow search or filters (max ${MAX_EXPORT_ROWS}).`,
    });
  }

  const rows = await db
    .select({
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

  const matrix = buildProjectFinancialsExportAoa(
    rows as ProjectFinancialExportRow[],
  );
  const dateLabel = toLocalDate(Date.now()) ?? "export";

  /**
   * File .xlsx dibuat di browser (composable), bukan di Nitro — paket `xlsx`
   * di server memicu ERR_UNSUPPORTED_ESM_URL_SCHEME (`d:`) di Windows.
   */
  return successResponse(event, "Project financials export matrix ready", {
    matrix,
    suggestedFileName: `project-financials-${dateLabel}.xlsx`,
  });
});
