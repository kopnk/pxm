import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { clients } from "~/server/db/schema/clients";
import { partners } from "~/server/db/schema/partners";
import { buildSearchOr } from "~/server/utils/searchAmountSql";

const FINANCIAL_STATUSES = [
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
] as const;

const FLOW_DIRECTIONS = ["in", "out"] as const;

export type ProjectFinancialsListFilterInput = {
  projectId?: string;
  projectDetailId?: string;
  search?: string;
  status?: string;
  flowDirection?: string;
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
    const searchOr = buildSearchOr(input.search.trim(), {
      ilike: [
        projectFinancials.bastNumber,
        projectFinancials.balapNumber,
        projectFinancials.invoiceNumberPartner,
        projectFinancials.invoiceNumberClient,
        projectFinancials.poNumberPartner,
        projectFinancials.poNumberClient,
        projectFinancials.fpNumberPartner,
        projectFinancials.fpNumberClient,
        projectFinancials.vbNumber,
        projectFinancials.mcmNumber,
        projectFinancials.paidNumber,
        projectFinancials.docNumber,
        projects.poNumber,
        projects.projectName,
        projectDetails.materialName,
        projectDetails.siteName,
        projectDetails.systemkey,
        projectDetails.siteId,
        partners.name,
        clients.name,
      ],
      asText: [
        projectFinancials.qtyPartner,
        projectFinancials.unitPricePartner,
        projectFinancials.qtyClient,
        projectFinancials.unitPriceClient,
        projectFinancials.taxIn,
        projectFinancials.taxOut,
        projectFinancials.pph,
        projectFinancials.stage,
        projectDetails.quantity,
        projectDetails.unitPrice,
        projectDetails.totalPrice,
        projectFinancials.balapDate,
        projectFinancials.bastDate,
        projectFinancials.docDate,
        projectFinancials.vbDate,
        projectFinancials.mcmDate,
        projectFinancials.paidDate,
        projectFinancials.poDatePartner,
        projectFinancials.poDateClient,
        projectFinancials.invoiceDatePartner,
        projectFinancials.invoiceDateClient,
        projectFinancials.fpDatePartner,
        projectFinancials.fpDateClient,
      ],
    });
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

  if (input.flowDirection) {
    const flow = input.flowDirection;
    if ((FLOW_DIRECTIONS as readonly string[]).includes(flow)) {
      conditions.push(
        eq(
          projectFinancials.flowDirection,
          flow as (typeof FLOW_DIRECTIONS)[number],
        ),
      );
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}
