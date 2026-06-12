import type { H3Event } from "h3";
import { createError, getQuery } from "h3";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { clients } from "~/server/db/schema/clients";
import { partners } from "~/server/db/schema/partners";
import { requireRole } from "~/server/utils/authorize";
import { buildProjectFinancialsListWhere } from "~/server/utils/projectFinancialsListWhere";
import {
  buildProjectFinancialsTaxSectionExportAoa,
  projectFinancialsTaxSectionKindWhere,
  type ProjectFinancialTaxSectionExportRow,
  type ProjectFinancialTaxSectionKind,
} from "~/server/utils/buildProjectFinancialsTaxSectionExportAoa";
import { projectFinancialsTaxSectionExportQueryZ } from "~/server/validation/project_financials.schema";
import { exportFileDateLabel } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { buildTotalPages } from "~/server/utils/pagination";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { firstQuery } from "~/server/utils/firstQuery";

export async function handleProjectFinancialsTaxSectionExport(
  event: H3Event,
  kind: ProjectFinancialTaxSectionKind,
) {
  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectFinancialsTaxSectionExportQueryZ.safeParse({
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
  const baseWhere = buildProjectFinancialsListWhere({
    search: q.search,
    status: q.status,
  });
  const sectionWhere = projectFinancialsTaxSectionKindWhere(kind);
  const where = baseWhere ? and(baseWhere, sectionWhere) : sectionWhere;

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
  const page = q.page ?? 1;
  const limit = q.limit ?? DEFAULT_PAGE_LIMIT;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      flowDirection: projectFinancials.flowDirection,
      taxIn: projectFinancials.taxIn,
      taxOut: projectFinancials.taxOut,
      pph: projectFinancials.pph,
      qtyPartner: projectFinancials.qtyPartner,
      unitPricePartner: projectFinancials.unitPricePartner,
      qtyClient: projectFinancials.qtyClient,
      unitPriceClient: projectFinancials.unitPriceClient,
      docNumber: projectFinancials.docNumber,
      docDate: projectFinancials.docDate,
      invoiceNumberPartner: projectFinancials.invoiceNumberPartner,
      invoiceDatePartner: projectFinancials.invoiceDatePartner,
      invoiceNumberClient: projectFinancials.invoiceNumberClient,
      invoiceDateClient: projectFinancials.invoiceDateClient,
      partnerNpwp: partners.npwp,
      partnerName: partners.name,
      partnerAddressText: partners.addressText,
      partnerAddressMeta: partners.addressMeta,
      clientNpwp: clients.npwp,
      clientName: clients.name,
      clientAddressText: clients.addressText,
      clientAddressMeta: clients.addressMeta,
      projectName: projects.projectName,
      projectPoNumber: projects.poNumber,
      detailMaterialName: projectDetails.materialName,
      detailSiteName: projectDetails.siteName,
      detailSiteId: projectDetails.siteId,
      detailSystemkey: projectDetails.systemkey,
    })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where)
    .orderBy(desc(projectFinancials.createdAt), desc(projectFinancials.id))
    .limit(limit)
    .offset(offset);

  const exportRows = rows as ProjectFinancialTaxSectionExportRow[];
  const matrix = buildProjectFinancialsTaxSectionExportAoa(kind, exportRows);
  const dateLabel = exportFileDateLabel();
  const slug =
    kind === "taxIn" ? "tax-in" : kind === "taxOut" ? "tax-out" : "pph";

  return successResponse(event, "Project financials tax section export ready", {
    matrix,
    suggestedFileName: `project-financials-${slug}-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      total,
      totalPages: buildTotalPages(total, limit),
      exportedLines: exportRows.length,
    },
  });
}
