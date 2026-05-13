import type { SQL } from "drizzle-orm";
import { and, or, ilike, eq, sql } from "drizzle-orm";
import { projects } from "~/server/db/schema/projects";
import { clients } from "~/server/db/schema/clients";

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
    const keyword = `%${search}%`;
    const sOr = or(
      ilike(projects.projectName, keyword),
      ilike(projects.poNumber, keyword),
      ilike(projects.prScNumber, keyword),
      ilike(projects.contractNumber, keyword),
      ilike(projects.pm, keyword),
      ilike(projects.status, keyword),
      ilike(clients.name, keyword),
      sql`${projects.poDate}::text ILIKE ${keyword}`,
      sql`${projects.deliveryDate}::text ILIKE ${keyword}`,
      sql`${projects.komDate}::text ILIKE ${keyword}`,
      sql`${projects.subTotal}::text ILIKE ${keyword}`,
      sql`${projects.discount}::text ILIKE ${keyword}`,
      sql`${projects.netPrice}::text ILIKE ${keyword}`,
      sql`${projects.vatAmount}::text ILIKE ${keyword}`,
      sql`${projects.grandTotal}::text ILIKE ${keyword}`,
    );
    if (sOr) conditions.push(sOr);
  }

  if (status) {
    conditions.push(eq(projects.status, status));
  }

  return conditions.length ? and(...conditions) : undefined;
}
