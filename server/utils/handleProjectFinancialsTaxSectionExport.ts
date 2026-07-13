import type { H3Event } from "h3";
import { createError, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import {
  buildProjectFinancialsTaxSectionExportAoa,
  matchesProjectFinancialsTaxSectionKind,
  type ProjectFinancialTaxSectionExportRow,
  type ProjectFinancialTaxSectionKind,
} from "~/server/utils/buildProjectFinancialsTaxSectionExportAoa";
import { projectFinancialsTaxSectionExportQueryZ } from "~/server/validation/project_financials.schema";
import { exportFileDateLabel } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { firstQuery } from "~/server/utils/firstQuery";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

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
  const records = await listProjectFinancialRecords({
    search: q.search,
    status: q.status,
  });
  const filtered = records.filter((record) =>
    matchesProjectFinancialsTaxSectionKind(kind, record),
  );
  const total = filtered.length;
  const { page, limit, offset } = buildPagination(q);
  const exportRows = filtered
    .slice(offset, offset + limit)
    .map((row) => ({
      flowDirection: row.flowDirection,
      taxIn: row.taxIn,
      taxOut: row.taxOut,
      pph: row.pph,
      qtyPartner: row.qtyPartner,
      unitPricePartner: row.unitPricePartner,
      qtyClient: row.qtyClient,
      unitPriceClient: row.unitPriceClient,
      docNumber: row.docNumber,
      docDate: row.docDate,
      invoiceNumberPartner: row.invoiceNumberPartner,
      invoiceDatePartner: row.invoiceDatePartner,
      invoiceNumberClient: row.invoiceNumberClient,
      invoiceDateClient: row.invoiceDateClient,
      partnerNpwp: row.partnerNpwp,
      partnerName: row.partnerName,
      partnerAddressText: row.partnerAddressText,
      partnerAddressMeta: row.partnerAddressMeta,
      clientNpwp: row.clientNpwp,
      clientName: row.clientName,
      clientAddressText: row.clientAddressText,
      clientAddressMeta: row.clientAddressMeta,
      projectName: row.projectName,
      projectPoNumber: row.projectPoNumber,
      detailMaterialName: row.detailMaterialName,
      detailSiteName: row.detailSiteName,
      detailSiteId: row.detailSiteId,
      detailSystemkey: row.detailSystemkey,
    })) as ProjectFinancialTaxSectionExportRow[];
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
