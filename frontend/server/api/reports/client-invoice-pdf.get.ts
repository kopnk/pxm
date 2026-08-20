import { createError, defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildClientInvoicePdfBuffer } from "~/server/utils/buildClientInvoicePdf";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

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
  const rows = (await listProjectFinancialRecords({
    flowDirection: "out",
  }))
    .filter((row) => {
      if (row.status === "cancelled") return false;
      if (row.invoiceNumberClient !== invoice) return false;
      if (clientId && row.clientId !== clientId) return false;
      return true;
    })
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
      statusMessage: "No client invoice lines found",
    });
  }

  const first = rows[0]!;
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
      poDateClient: first.poDate,
      projectName: first.projectName,
      clientName: first.clientName,
      clientBankName: first.clientBankName,
      clientBankAccount: first.clientBankAccount,
      clientCity:
        ((first.clientAddressMeta as { city?: unknown } | null)?.city as
          | string
          | undefined) ?? null,
      signatoryName: first.clientSignatoryName,
      signatoryTitle: first.clientSignatoryTitle,
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
