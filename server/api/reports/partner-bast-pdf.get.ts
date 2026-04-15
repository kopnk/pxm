import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { partners } from "~/server/db/schema/partners";
import { requireRole } from "~/server/utils/authorize";
import { and, asc, eq, ne } from "drizzle-orm";
import { buildPartnerBastPdfBuffer } from "~/server/utils/buildPartnerBastPdf";
import { formatDateToIdText, formatDateToIdWeekday } from "~/utils/formatDateToIdText";

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

  const rows = await db
    .select({
      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,
      workType: projectDetails.materialName,
      projectName: projects.projectName,
      poNumberPartner: projectFinancials.poNumberPartner,
      poDatePartner: projectFinancials.poDatePartner,
      bastDate: projectFinancials.bastDate,
      partnerName: partners.name,
      partnerAddressText: partners.addressText,
      signatoryName: partners.signatoryName,
      signatoryTitle: partners.signatoryTitle,
    })
    .from(projectFinancials)
    .innerJoin(projects, eq(projectFinancials.projectId, projects.id))
    .innerJoin(projectDetails, eq(projectFinancials.projectDetailId, projectDetails.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(
      and(
        eq(projectFinancials.flowDirection, "in"),
        eq(projectFinancials.bastNumber, bast),
        ne(projectFinancials.status, "cancelled"),
      ),
    )
    .orderBy(asc(projectDetails.siteName), asc(projectDetails.siteId));

  if (!rows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No partner (in) lines for this BAST number",
    });
  }

  const first = rows[0];
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
      siteId: r.siteId,
      siteName: r.siteName,
      workType: r.workType,
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
      signatoryName: first.signatoryName,
      signatoryTitle: first.signatoryTitle,
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
