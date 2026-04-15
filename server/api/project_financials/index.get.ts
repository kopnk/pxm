import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { clients } from "~/server/db/schema/clients";
import { partners } from "~/server/db/schema/partners";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { and, eq, ilike, or, count, desc, getTableColumns } from "drizzle-orm";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  if (query.projectId) {
    conditions.push(eq(projectFinancials.projectId, String(query.projectId)));
  }

  if (query.projectDetailId) {
    conditions.push(eq(projectFinancials.projectDetailId, String(query.projectDetailId)));
  }

  if (query.search) {
    const s = `%${String(query.search)}%`;
    conditions.push(
      or(
        ilike(projectFinancials.bastNumber, s),
        ilike(projectFinancials.balapNumber, s),
        ilike(projectFinancials.invoiceNumberPartner, s),
        ilike(projectFinancials.invoiceNumberClient, s),
        ilike(projectFinancials.docNumber, s),
        ilike(projects.poNumber, s),
        ilike(projects.projectName, s),
        ilike(projectDetails.materialName, s),
        ilike(projectDetails.siteName, s),
        ilike(projectDetails.systemkey, s),
        ilike(projectDetails.siteId, s),
      ),
    );
  }

  if (query.status) {
    const st = String(query.status);
    const allowed = [
      "draft",
      "issued",
      "approved",
      "paid",
      "cancelled",
    ] as const;
    if ((allowed as readonly string[]).includes(st)) {
      conditions.push(
        eq(
          projectFinancials.status,
          st as (typeof allowed)[number],
        ),
      );
    }
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const joinChain = db
    .select({ value: count() })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where);

  const totalResult = await joinChain;
  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const rows = await db
    .select({
      ...getTableColumns(projectFinancials),
      projectName: projects.projectName,
      projectPoNumber: projects.poNumber,
      detailMaterialName: projectDetails.materialName,
      detailSystemkey: projectDetails.systemkey,
      detailSiteId: projectDetails.siteId,
      detailSiteName: projectDetails.siteName,
      clientName: clients.name,
      clientNpwp: clients.npwp,
      clientAddressText: clients.addressText,
      clientAddressMeta: clients.addressMeta,
      partnerName: partners.name,
      partnerNpwp: partners.npwp,
      partnerAddressText: partners.addressText,
      partnerAddressMeta: partners.addressMeta,
    })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where)
    .orderBy(desc(projectFinancials.createdAt), desc(projectFinancials.id))
    .limit(limit)
    .offset(offset);

  return successResponse(event, "Project financials retrieved", {
    items: rows.map((i) => ({ ...i })),
    page,
    limit,
    total,
    totalPages,
  });
});
