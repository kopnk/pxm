import { defineEventHandler, getQuery, getRequestURL, createError } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerPoPdfBuffer } from "~/server/utils/buildPartnerPoPdf";
import {
  signPartnerPoAccess,
  verifyPartnerPoAccess,
} from "~/server/utils/partnerPoPdfAccess";
import { pfFormatIdDate } from "~/lib/projectFinancialsMath";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

function safeFilename(po: string) {
  return po.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "PO";
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const po = String(query.po ?? "").trim();
  if (!po) {
    throw createError({ statusCode: 400, statusMessage: "Query po is required" });
  }

  const config = useRuntimeConfig(event);
  const secret = String(config.partnerPoPdfSecret || "");

  const access = String(query.access ?? "").trim();
  let allowed = false;
  if (secret && access) {
    const v = verifyPartnerPoAccess(access, secret);
    allowed = v?.po === po;
  }
  if (!allowed) {
    const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
    if (forbidden) return forbidden;
  }

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  }))
    .filter((row) => row.poNumberPartner === po && row.status !== "cancelled")
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
      statusMessage: "No partner (in) lines for this PO number",
    });
  }

  const first = rows[0]!;
  const poDates = rows
    .map((r) => r.poDatePartner)
    .filter(Boolean)
    .map((d) => String(d));
  const poDateLabel =
    poDates.length > 0 ? pfFormatIdDate(poDates.sort()[0]) : "—";

  const reqUrl = getRequestURL(event);
  const origin = `${reqUrl.protocol}//${reqUrl.host}`;
  const accessToken = secret ? signPartnerPoAccess(po, secret) : "";
  const qrTargetUrl = `${origin}/api/reports/partner-po-pdf?po=${encodeURIComponent(po)}${
    accessToken ? `&access=${encodeURIComponent(accessToken)}` : ""
  }`;

  const pdfBuffer = await buildPartnerPoPdfBuffer(rows, {
    poNumber: po,
    poDateLabel,
    projectName: first.projectName,
    projectPoNumber: first.projectPoNumber,
    partnerName: first.partnerName,
    partnerNpwp: first.partnerNpwp,
    partnerAddressText: first.partnerAddressText,
    signatoryName: first.partnerSignatoryName,
    signatoryTitle: first.partnerSignatoryTitle,
    qrTargetUrl,
  });

  const name = safeFilename(po);
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PO-${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
