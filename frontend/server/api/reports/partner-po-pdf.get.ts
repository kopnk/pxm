import {
  defineEventHandler,
  getQuery,
  getRequestURL,
  createError,
  sendRedirect,
} from "h3";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerPoPdfBuffer } from "~/server/utils/buildPartnerPoPdf";
import {
  resolvePartnerPoPdfReference,
  signPartnerPoAccess,
} from "~/server/utils/partnerPoPdfAccess";
import { pfFormatIdDate } from "~/lib/projectFinancialsMath";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";
import { matchesReportDocumentNumber } from "~/server/utils/reportDocumentNumber";
import { resolvePartnerPoPdfSecret } from "~/server/utils/partnerPoPdfSecret";

function safeFilename(po: string) {
  return po.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "PO";
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const config = useRuntimeConfig(event);
  const secret = await resolvePartnerPoPdfSecret(config.partnerPoPdfSecret);

  const reference = resolvePartnerPoPdfReference(query, secret);
  const { po, requestedPo } = reference;
  const allowed = Boolean(reference.verifiedPo);

  if (!po) {
    throw createError({ statusCode: 400, statusMessage: "PO reference is required" });
  }
  if (!allowed) {
    const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
    if (forbidden) return forbidden;

    if (secret && requestedPo) {
      const opaquePo = signPartnerPoAccess(requestedPo, secret);
      return sendRedirect(
        event,
        `/api/reports/partner-po-pdf?po=${encodeURIComponent(opaquePo)}`,
        302,
      );
    }
  }

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
    poNumberPartner: po,
  }, {
    includeAuditUsers: false,
    includeClients: false,
  }))
    .filter(
      (row) =>
        matchesReportDocumentNumber(row.poNumberPartner, po) &&
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
  const configuredOrigin = String(
    process.env.PXM_PUBLIC_APP_URL || config.appBaseUrl || "",
  )
    .trim()
    .replace(/\/+$/, "");
  const origin = configuredOrigin || `${reqUrl.protocol}//${reqUrl.host}`;
  const accessToken = secret ? signPartnerPoAccess(po, secret) : "";
  const qrTargetUrl = accessToken
    ? `${origin}/reports/partner-po?po=${encodeURIComponent(accessToken)}`
    : `${origin}/api/reports/partner-po-pdf?po=${encodeURIComponent(po)}`;

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
