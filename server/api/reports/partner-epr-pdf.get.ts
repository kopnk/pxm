import { createError, defineEventHandler, getQuery } from "h3";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { projectDetails } from "~/server/db/schema/project_details";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { requireRole } from "~/server/utils/authorize";
import { buildPartnerEprPdfBuffer } from "~/server/utils/buildPartnerEprPdf.ts";

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

  const rows = await db
    .select({
      invoiceNumberPartner: projectFinancials.invoiceNumberPartner,
      invoiceDatePartner: projectFinancials.invoiceDatePartner,
      detailMaterialName: projectDetails.materialName,
      qtyPartner: projectFinancials.qtyPartner,
      unitPricePartner: projectFinancials.unitPricePartner,
      pph: projectFinancials.pph,
      taxIn: projectFinancials.taxIn,
      projectName: projects.projectName,
      poNumberPartner: projectFinancials.poNumberPartner,
      poDatePartner: projectFinancials.poDatePartner,
      partnerName: partners.name,
      partnerBankName: partners.bankName,
      partnerBankAccount: partners.bankAccount,
    })
    .from(projectFinancials)
    .innerJoin(projects, eq(projectFinancials.projectId, projects.id))
    .innerJoin(projectDetails, eq(projectFinancials.projectDetailId, projectDetails.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(
      and(
        eq(projectFinancials.flowDirection, "in"),
        eq(projectFinancials.poNumberPartner, po),
        ne(projectFinancials.status, "cancelled"),
      ),
    )
    .orderBy(asc(projectFinancials.invoiceNumberPartner), asc(projectDetails.siteName));

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
