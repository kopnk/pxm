import type { SQL } from "drizzle-orm";
import { and, or, eq, ilike, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { regions } from "~/server/db/schema/regions";

/** Alias konsisten untuk join region (list + export). */
export const pdCity = alias(regions, "pd_city");
export const pdSub = alias(regions, "pd_sub");
export const pdRegion = alias(regions, "pd_region");

export type ProjectDetailsListFilterInput = {
  search?: string;
  projectId?: string;
  status?: string;
  cityKabId?: string;
};

/**
 * WHERE untuk `GET /api/project_details` (list) dan export Excel.
 */
export function buildProjectDetailsListWhere(
  input: ProjectDetailsListFilterInput,
): SQL | undefined {
  const conditions: SQL[] = [];

  const search = input.search?.trim();
  const projectId = input.projectId?.trim();
  const status = input.status?.trim();
  const cityKabId = input.cityKabId?.trim();

  if (search) {
    const sOr = or(
      ilike(projectDetails.systemkey, `%${search}%`),
      ilike(projectDetails.neId, `%${search}%`),
      ilike(projectDetails.materialName, `%${search}%`),
      ilike(projectDetails.materialId, `%${search}%`),
      ilike(projectDetails.siteId, `%${search}%`),
      ilike(projectDetails.siteName, `%${search}%`),
      ilike(projectDetails.picArea, `%${search}%`),
      ilike(projectDetails.uom, `%${search}%`),
      ilike(projectDetails.status, `%${search}%`),
      ilike(projectDetails.remarksProjectsDetails, `%${search}%`),
      ilike(projectDetails.remarksDelay, `%${search}%`),
      ilike(projectDetails.remarksCancel, `%${search}%`),
      ilike(projects.projectName, `%${search}%`),
      ilike(projects.poNumber, `%${search}%`),
      sql`${projectDetails.lineNumber}::text ILIKE ${`%${search}%`}`,
      sql`${projectDetails.quantity}::text ILIKE ${`%${search}%`}`,
      sql`${projectDetails.unitPrice}::text ILIKE ${`%${search}%`}`,
      sql`${projectDetails.totalPrice}::text ILIKE ${`%${search}%`}`,
      sql`${projectDetails.taxOut}::text ILIKE ${`%${search}%`}`,
      ilike(pdCity.name, `%${search}%`),
      ilike(pdSub.name, `%${search}%`),
      ilike(pdRegion.name, `%${search}%`),
    );
    if (sOr) conditions.push(sOr);
  }

  if (projectId) {
    conditions.push(eq(projectDetails.projectId, projectId));
  }

  if (status) {
    conditions.push(eq(projectDetails.status, status));
  }

  if (cityKabId) {
    conditions.push(eq(projectDetails.cityKabId, cityKabId));
  }

  return conditions.length ? and(...conditions) : undefined;
}
