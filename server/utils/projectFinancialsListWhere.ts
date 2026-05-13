import type { SQL } from "drizzle-orm";
import { and, eq, ilike, or } from "drizzle-orm";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { clients } from "~/server/db/schema/clients";
import { partners } from "~/server/db/schema/partners";

const FINANCIAL_STATUSES = [
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
] as const;

export type ProjectFinancialsListFilterInput = {
  projectId?: string;
  projectDetailId?: string;
  search?: string;
  status?: string;
};

/**
 * WHERE clause shared by `GET /api/project_financials` (list) and export.
 */
export function buildProjectFinancialsListWhere(
  input: ProjectFinancialsListFilterInput,
): SQL | undefined {
  const conditions: SQL[] = [];

  if (input.projectId) {
    conditions.push(eq(projectFinancials.projectId, input.projectId));
  }

  if (input.projectDetailId) {
    conditions.push(
      eq(projectFinancials.projectDetailId, input.projectDetailId),
    );
  }

  if (input.search) {
    const s = `%${input.search}%`;
    const searchOr = or(
        ilike(projectFinancials.bastNumber, s),
        ilike(projectFinancials.balapNumber, s),
        ilike(projectFinancials.invoiceNumberPartner, s),
        ilike(projectFinancials.invoiceNumberClient, s),
        ilike(projectFinancials.poNumberPartner, s),
        ilike(projectFinancials.poNumberClient, s),
        ilike(projectFinancials.fpNumberPartner, s),
        ilike(projectFinancials.fpNumberClient, s),
        ilike(projectFinancials.docNumber, s),
        ilike(projects.poNumber, s),
        ilike(projects.projectName, s),
        ilike(projectDetails.materialName, s),
        ilike(projectDetails.siteName, s),
        ilike(projectDetails.systemkey, s),
        ilike(projectDetails.siteId, s),
        ilike(partners.name, s),
        ilike(clients.name, s),
      );
    if (searchOr) {
      conditions.push(searchOr);
    }
  }

  if (input.status) {
    const st = input.status;
    if ((FINANCIAL_STATUSES as readonly string[]).includes(st)) {
      conditions.push(
        eq(
          projectFinancials.status,
          st as (typeof FINANCIAL_STATUSES)[number],
        ),
      );
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}
