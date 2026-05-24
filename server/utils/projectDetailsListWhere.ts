import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { regions } from "~/server/db/schema/regions";
import { buildSearchOr } from "~/server/utils/searchAmountSql";

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
    const sOr = buildSearchOr(search, {
      ilike: [
        projectDetails.systemkey,
        projectDetails.neId,
        projectDetails.materialName,
        projectDetails.materialId,
        projectDetails.siteId,
        projectDetails.siteName,
        projectDetails.picArea,
        projectDetails.uom,
        projectDetails.status,
        projectDetails.remarksProjectsDetails,
        projectDetails.remarksDelay,
        projectDetails.remarksCancel,
        projects.projectName,
        projects.poNumber,
        pdCity.name,
        pdSub.name,
        pdRegion.name,
      ],
      asText: [
        projectDetails.lineNumber,
        projectDetails.quantity,
        projectDetails.unitPrice,
        projectDetails.totalPrice,
        projectDetails.taxOut,
      ],
    });
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
