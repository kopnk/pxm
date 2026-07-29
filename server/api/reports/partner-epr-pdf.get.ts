import { createError, defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerEprPdfBuffer } from "~/server/utils/buildPartnerEprPdf";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";
import { matchesReportDocumentNumber } from "~/server/utils/reportDocumentNumber";

function safeFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "EPR";
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const po = String(query.po ?? "").trim();
  if (!po) {
    throw createError({
      statusCode: 400,
      statusMessage: "Query po is required",
    });
  }

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  }))
    .filter(
      (row) =>
        matchesReportDocumentNumber(row.poNumberPartner, po) &&
        row.status !== "cancelled",
    )
    .sort((a, b) => {
      const invoiceCompare = String(a.invoiceNumberPartner ?? "").localeCompare(
        String(b.invoiceNumberPartner ?? ""),
      );
      if (invoiceCompare !== 0) return invoiceCompare;
      return String(a.detailSiteName ?? "").localeCompare(String(b.detailSiteName ?? ""));
    });

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner EPR data found for this PO number",
    });
  }

  const pdfBuffer = await buildPartnerEprPdfBuffer(rows, po);
  const filename = safeFilename(po);
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="EPR-${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
