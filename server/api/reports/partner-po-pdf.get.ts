import { defineEventHandler, getQuery, getRequestURL, createError } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { partners } from "~/server/db/schema/partners";
import { requireRole } from "~/server/utils/authorize";
import { and, asc, eq, ne } from "drizzle-orm";
import { buildPartnerPoPdfBuffer } from "~/server/utils/buildPartnerPoPdf";
import {
  signPartnerPoAccess,
  verifyPartnerPoAccess,
} from "~/server/utils/partnerPoPdfAccess";
import { pfFormatIdDate } from "~/lib/projectFinancialsMath";

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

  const rows = await db
    .select({
      detailSiteId: projectDetails.siteId,
      detailSiteName: projectDetails.siteName,
      detailMaterialName: projectDetails.materialName,
      qtyPartner: projectFinancials.qtyPartner,
      unitPricePartner: projectFinancials.unitPricePartner,
      pph: projectFinancials.pph,
      taxIn: projectFinancials.taxIn,
      projectName: projects.projectName,
      projectPoNumber: projects.poNumber,
      poDatePartner: projectFinancials.poDatePartner,
      partnerName: partners.name,
      partnerNpwp: partners.npwp,
      partnerAddressText: partners.addressText,
      signatoryName: partners.signatoryName,
      signatoryTitle: partners.signatoryTitle,
    })
    .from(projectFinancials)
    .innerJoin(projects, eq(projectFinancials.projectId, projects.id))
    .innerJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(
      and(
        eq(projectFinancials.flowDirection, "in"),
        eq(projectFinancials.poNumberPartner, po),
        ne(projectFinancials.status, "cancelled"),
      ),
    )
    .orderBy(asc(projectDetails.siteName), asc(projectDetails.siteId));

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner (in) lines for this PO number",
    });
  }

  const first = rows[0];
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
    signatoryName: first.signatoryName,
    signatoryTitle: first.signatoryTitle,
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
