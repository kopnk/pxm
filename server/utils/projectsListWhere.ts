import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { projects } from "~/server/db/schema/projects";
import { clients } from "~/server/db/schema/clients";
import { buildSearchOr } from "~/server/utils/searchAmountSql";

export type ProjectsListFilterInput = {
  search?: string;
  status?: string;
};

/**
 * WHERE untuk `GET /api/projects` (list) dan export Excel.
 */
export function buildProjectsListWhere(
  input: ProjectsListFilterInput,
): SQL | undefined {
  const conditions: SQL[] = [];

  const search = input.search?.trim();
  const status = input.status?.trim();

  if (search) {
    const sOr = buildSearchOr(search, {
      ilike: [
        projects.projectName,
        projects.poNumber,
        projects.prScNumber,
        projects.contractNumber,
        projects.pm,
        projects.status,
        clients.name,
      ],
      asText: [
        projects.poDate,
        projects.deliveryDate,
        projects.komDate,
        projects.subTotal,
        projects.discount,
        projects.netPrice,
        projects.vatRate,
        projects.vatAmount,
        projects.grandTotal,
      ],
    });
    if (sOr) conditions.push(sOr);
  }

  if (status) {
    conditions.push(eq(projects.status, status));
  }

  return conditions.length ? and(...conditions) : undefined;
}
