import { defineEventHandler, getQuery, createError } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerBastPdfBuffer } from "~/server/utils/buildPartnerBastPdf";
import { formatDateToIdText, formatDateToIdWeekday } from "~/utils/formatDateToIdText";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

function safeFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "BAST";
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const bast = String(query.bast ?? "").trim();
  if (!bast) {
    throw createError({ statusCode: 400, statusMessage: "Query bast is required" });
  }

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  }))
    .filter((row) => row.bastNumber === bast && row.status !== "cancelled")
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
      statusMessage: "No partner (in) lines for this BAST number",
    });
  }

  const first = rows[0]!;
  const poDates = rows
    .map((r) => r.poDatePartner)
    .filter(Boolean)
    .map((d) => String(d));
  const poDatePartnerLabel = poDates.length ? formatDateToIdText(poDates.sort()[0]) : null;

  const bastDates = rows
    .map((r) => r.bastDate)
    .filter(Boolean)
    .map((d) => String(d));
  const bastDateSource = bastDates.length ? bastDates.sort()[0] : null;
  const bastDateLabel = bastDateSource ? formatDateToIdText(bastDateSource) : "—";
  const bastWeekdayLabel = bastDateSource ? formatDateToIdWeekday(bastDateSource) : "—";

  const pdfBuffer = await buildPartnerBastPdfBuffer(
    rows.map((r) => ({
      siteId: r.detailSiteId,
      siteName: r.detailSiteName,
      workType: r.detailMaterialName,
    })),
    {
      bastNumber: bast,
      bastWeekdayLabel,
      bastDateLabel,
      poNumberPartner: first.poNumberPartner,
      poDatePartnerLabel,
      projectName: first.projectName,
      partnerName: first.partnerName,
      partnerAddressText: first.partnerAddressText,
      signatoryName: first.partnerSignatoryName,
      signatoryTitle: first.partnerSignatoryTitle,
    },
  );

  const filename = safeFilename(bast);
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BAST-${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
