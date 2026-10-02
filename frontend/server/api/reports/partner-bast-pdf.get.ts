import { defineEventHandler, getQuery, createError } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerBastPdfBuffer } from "~/server/utils/buildPartnerBastPdf";
import { formatDateToIdText, formatDateToIdWeekday } from "~/utils/formatDateToIdText";
import {
  listProjectFinancialRecords,
  selectKopindosatSignatoryRecord,
} from "~/server/utils/projectFinancialStore";

function safeFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "BAST";
}

function formatPaymentTerm(installment: unknown, installmentPercent: unknown) {
  const termNames: Record<string, string> = {
    "1st": "pertama",
    "2nd": "kedua",
    "3rd": "ketiga",
    Final: "akhir",
  };
  const percent = Number(installmentPercent);
  const normalizedPercent = Number.isFinite(percent) && percent >= 0 && percent <= 100
    ? percent
    : 100;
  const percentLabel = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(normalizedPercent);
  const termName = termNames[String(installment)] || "pembayaran";

  return `termin ${termName} sebesar ${percentLabel}%`;
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const bast = String(query.bast ?? "").trim();
  const projectId = String(query.projectId ?? "").trim();
  if (!bast) {
    throw createError({ statusCode: 400, statusMessage: "Query bast is required" });
  }

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  }))
    .filter((row) => row.bastNumber === bast && (!projectId || row.projectId === projectId) && row.status !== "cancelled")
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
  if (!projectId && new Set(rows.map((row) => row.projectId)).size > 1) {
    throw createError({ statusCode: 400, statusMessage: "projectId is required for a BAST number used in multiple projects" });
  }

  const first = rows[0]!;
  const signatory = selectKopindosatSignatoryRecord(rows) ?? first;
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
  const paymentTerms = [...new Set(
    rows.map((row) => formatPaymentTerm(row.partnerInstallment, row.partnerInstallmentPercent)),
  )];

  const pdfBuffer = await buildPartnerBastPdfBuffer(
    rows.map((r) => ({
      siteId: r.detailSiteId,
      siteName: r.detailSiteName,
      workType: r.detailMaterialName,
      partnerDocumentWorkLocation: r.partnerDocumentWorkLocation,
      qtyPartner: r.qtyPartner,
      uom: r.detailUom,
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
      kopindosatSignatoryName: signatory.kopindosatSignatoryName,
      kopindosatSignatoryTitle: signatory.kopindosatSignatoryTitle,
      paymentTerms,
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
