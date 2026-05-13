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
import {
  sqlClientListLineContribution,
  sqlPartnerListLineContribution,
  sqlPphSectionDppContribution,
  sqlPphSectionTaxContribution,
  sqlTaxInSectionDppContribution,
  sqlTaxInSectionTaxContribution,
  sqlTaxOutSectionDppContribution,
  sqlTaxOutSectionTaxContribution,
} from "~/server/utils/projectFinancialsListTotalsSql";
import { buildProjectFinancialsListWhere } from "~/server/utils/projectFinancialsListWhere";
import { count, desc, eq, getTableColumns, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const where = buildProjectFinancialsListWhere({
    projectId: query.projectId ? String(query.projectId) : undefined,
    projectDetailId: query.projectDetailId
      ? String(query.projectDetailId)
      : undefined,
    search: query.search ? String(query.search) : undefined,
    status: query.status ? String(query.status) : undefined,
  });

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

  const totalsJoin = db
    .select({
      sumPartnerLines: sql<string>`coalesce(sum(${sqlPartnerListLineContribution}), 0)`.as(
        "sum_partner_lines",
      ),
      sumClientLines: sql<string>`coalesce(sum(${sqlClientListLineContribution}), 0)`.as(
        "sum_client_lines",
      ),
      sumTaxInSectionDpp: sql<string>`coalesce(sum(${sqlTaxInSectionDppContribution}), 0)`.as(
        "sum_tax_in_section_dpp",
      ),
      sumTaxInSectionTax: sql<string>`coalesce(sum(${sqlTaxInSectionTaxContribution}), 0)`.as(
        "sum_tax_in_section_tax",
      ),
      sumTaxOutSectionDpp: sql<string>`coalesce(sum(${sqlTaxOutSectionDppContribution}), 0)`.as(
        "sum_tax_out_section_dpp",
      ),
      sumTaxOutSectionTax: sql<string>`coalesce(sum(${sqlTaxOutSectionTaxContribution}), 0)`.as(
        "sum_tax_out_section_tax",
      ),
      sumPphSectionDpp: sql<string>`coalesce(sum(${sqlPphSectionDppContribution}), 0)`.as(
        "sum_pph_section_dpp",
      ),
      sumPphSectionTax: sql<string>`coalesce(sum(${sqlPphSectionTaxContribution}), 0)`.as(
        "sum_pph_section_tax",
      ),
    })
    .from(projectFinancials)
    .leftJoin(projects, eq(projectFinancials.projectId, projects.id))
    .leftJoin(
      projectDetails,
      eq(projectFinancials.projectDetailId, projectDetails.id),
    )
    .leftJoin(clients, eq(projectFinancials.clientId, clients.id))
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(where);

  const totalsRow = await totalsJoin;
  const partnerLineTotalFiltered = Number(totalsRow[0]?.sumPartnerLines ?? 0);
  const clientLineTotalFiltered = Number(totalsRow[0]?.sumClientLines ?? 0);
  const taxInSectionDppFiltered = Number(totalsRow[0]?.sumTaxInSectionDpp ?? 0);
  const taxInSectionTaxFiltered = Number(totalsRow[0]?.sumTaxInSectionTax ?? 0);
  const taxOutSectionDppFiltered = Number(totalsRow[0]?.sumTaxOutSectionDpp ?? 0);
  const taxOutSectionTaxFiltered = Number(totalsRow[0]?.sumTaxOutSectionTax ?? 0);
  const pphSectionDppFiltered = Number(totalsRow[0]?.sumPphSectionDpp ?? 0);
  const pphSectionTaxFiltered = Number(totalsRow[0]?.sumPphSectionTax ?? 0);

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
    totals: {
      partnerLineIdr: partnerLineTotalFiltered,
      clientLineIdr: clientLineTotalFiltered,
      taxInSection: {
        dppIdr: taxInSectionDppFiltered,
        taxIdr: taxInSectionTaxFiltered,
      },
      taxOutSection: {
        dppIdr: taxOutSectionDppFiltered,
        taxIdr: taxOutSectionTaxFiltered,
      },
      pphSection: {
        dppIdr: pphSectionDppFiltered,
        taxIdr: pphSectionTaxFiltered,
      },
    },
  });
});
