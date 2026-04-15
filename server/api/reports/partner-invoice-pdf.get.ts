import { createError, defineEventHandler, getQuery } from "h3";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { projectDetails } from "~/server/db/schema/project_details";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerInvoicePdfBuffer } from "~/server/utils/buildPartnerInvoicePdf";

function safeFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "KWITANSI";
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const invoice = String(query.invoice ?? "").trim();
  if (!invoice) {
    throw createError({
      statusCode: 400,
      statusMessage: "Query invoice is required",
    });
  }

  const rows = await db
    .select({
      detailSiteId: projectDetails.siteId,
      detailSiteName: projectDetails.siteName,
      detailMaterialName: projectDetails.materialName,
      qtyPartner: projectFinancials.qtyPartner,
      unitPricePartner: projectFinancials.unitPricePartner,
      projectName: projects.projectName,
      poNumberPartner: projectFinancials.poNumberPartner,
      poDatePartner: projectFinancials.poDatePartner,
      invoiceDatePartner: projectFinancials.invoiceDatePartner,
      partnerName: partners.name,
      partnerBankName: partners.bankName,
      partnerBankAccount: partners.bankAccount,
      partnerAddressMeta: partners.addressMeta,
      signatoryName: partners.signatoryName,
    })
    .from(projectFinancials)
    .innerJoin(projects, eq(projectFinancials.projectId, projects.id))
    .innerJoin(projectDetails, eq(projectFinancials.projectDetailId, projectDetails.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(
      and(
        eq(projectFinancials.flowDirection, "in"),
        eq(projectFinancials.invoiceNumberPartner, invoice),
        ne(projectFinancials.status, "cancelled"),
      ),
    )
    .orderBy(asc(projectDetails.siteName), asc(projectDetails.siteId));

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner invoice lines found",
    });
  }

  const first = rows[0];
  if (!first) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner invoice lines found",
    });
  }

  const pdfBuffer = await buildPartnerInvoicePdfBuffer(
    rows.map((row) => ({
      detailSiteId: row.detailSiteId,
      detailSiteName: row.detailSiteName,
      detailMaterialName: row.detailMaterialName,
      qtyPartner: row.qtyPartner,
      unitPricePartner: row.unitPricePartner,
    })),
    {
      invoiceNumber: invoice,
      invoiceDate: first.invoiceDatePartner,
      poNumberPartner: first.poNumberPartner,
      poDatePartner: first.poDatePartner,
      projectName: first.projectName,
      partnerName: first.partnerName,
      partnerBankName: first.partnerBankName,
      partnerBankAccount: first.partnerBankAccount,
      partnerCity:
        ((first.partnerAddressMeta as { city?: unknown } | null)?.city as
          | string
          | undefined) ?? null,
      signatoryName: first.signatoryName,
    },
  );

  const filename = safeFilename(invoice);
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="KWITANSI-${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
