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
  if (total > MAX_EXPORT_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many rows (${total}). Narrow search or filters (max ${MAX_EXPORT_ROWS}).`,
    });
  }

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
    .orderBy(desc(projectFinancials.createdAt), desc(projectFinancials.id));

  const matrix = buildProjectFinancialsTaxSectionExportAoa(
    kind,
    rows as ProjectFinancialTaxSectionExportRow[],
  );
  const dateLabel = toLocalDate(new Date()) ?? "export";
  const slug =
    kind === "taxIn" ? "tax-in" : kind === "taxOut" ? "tax-out" : "pph";

  return successResponse(event, "Project financials tax section export ready", {
    matrix,
    suggestedFileName: `project-financials-${slug}-${dateLabel}.xlsx`,
  });
}
