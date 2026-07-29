import { createError, defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerInvoicePdfBuffer } from "~/server/utils/buildPartnerInvoicePdf";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";
import { matchesReportDocumentNumber } from "~/server/utils/reportDocumentNumber";

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

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  }))
    .filter(
      (row) =>
        matchesReportDocumentNumber(row.invoiceNumberPartner, invoice) &&
        row.status !== "cancelled",
    )
    .sort((a, b) => {
      const siteNameCompare = String(a.detailSiteName ?? "").localeCompare(
        String(b.detailSiteName ?? ""),
      );
      if (siteNameCompare !== 0) return siteNameCompare;
      return String(a.detailSiteId ?? "").localeCompare(String(b.detailSiteId ?? ""));
    });

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner invoice lines found",
    });
  }

  const first = rows[0]!;
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
      signatoryName: first.partnerSignatoryName,
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
