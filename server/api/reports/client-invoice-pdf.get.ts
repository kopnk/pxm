import { createError, defineEventHandler, getQuery } from "h3";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "~/server/db";
import { clients } from "~/server/db/schema/clients";
import { projectDetails } from "~/server/db/schema/project_details";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { requireRole } from "~/server/utils/authorize";
import { buildClientInvoicePdfBuffer } from "~/server/utils/buildClientInvoicePdf";

function safeFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "KWITANSI";
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const invoice = String(query.invoice ?? "").trim();
  const clientId = String(query.clientId ?? "").trim();
  if (!invoice) {
    throw createError({
      statusCode: 400,
      statusMessage: "Query invoice is required",
    });
  }
  const whereClause = clientId
    ? and(
        eq(projectFinancials.flowDirection, "out"),
        eq(projectFinancials.invoiceNumberClient, invoice),
        eq(projectFinancials.clientId, clientId),
        ne(projectFinancials.status, "cancelled"),
      )
    : and(
        eq(projectFinancials.flowDirection, "out"),
        eq(projectFinancials.invoiceNumberClient, invoice),
        ne(projectFinancials.status, "cancelled"),
      );

  const rows = await db
    .select({
      detailSiteId: projectDetails.siteId,
      detailSiteName: projectDetails.siteName,
      detailMaterialName: projectDetails.materialName,
      qtyClient: projectFinancials.qtyClient,
      unitPriceClient: projectFinancials.unitPriceClient,
      projectName: projects.projectName,
      projectPoNumber: projects.poNumber,
      projectPoDate: projects.poDate,
      invoiceDateClient: projectFinancials.invoiceDateClient,
      clientName: clients.name,
      clientBankName: clients.bankName,
      clientBankAccount: clients.bankAccount,
      clientAddressMeta: clients.addressMeta,
      signatoryName: clients.signatoryName,
      signatoryTitle: clients.signatoryTitle,
    })
    .from(projectFinancials)
    .innerJoin(projects, eq(projectFinancials.projectId, projects.id))
    .innerJoin(projectDetails, eq(projectFinancials.projectDetailId, projectDetails.id))
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .where(whereClause)
    .orderBy(asc(projectDetails.siteName), asc(projectDetails.siteId));

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No client invoice lines found",
    });
  }

  const first = rows[0];
  if (!first) {
    throw createError({
      statusCode: 404,
      statusMessage: "No client invoice lines found",
    });
  }

  const pdfBuffer = await buildClientInvoicePdfBuffer(
    rows.map((row) => ({
      detailSiteId: row.detailSiteId,
      detailSiteName: row.detailSiteName,
      detailMaterialName: row.detailMaterialName,
      qtyClient: row.qtyClient,
      unitPriceClient: row.unitPriceClient,
    })),
    {
      invoiceNumber: invoice,
      invoiceDate: first.invoiceDateClient,
      poNumberClient: first.projectPoNumber,
      poDateClient: first.projectPoDate,
      projectName: first.projectName,
      clientName: first.clientName,
      clientBankName: first.clientBankName,
      clientBankAccount: first.clientBankAccount,
      clientCity:
        ((first.clientAddressMeta as { city?: unknown } | null)?.city as
          | string
          | undefined) ?? null,
      signatoryName: first.signatoryName,
      signatoryTitle: first.signatoryTitle,
    },
  );

  const filename = safeFilename(invoice);
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="INVOICE-${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
