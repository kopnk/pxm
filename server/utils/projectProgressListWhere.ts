import type { SQL } from "drizzle-orm";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";

export type ProjectProgressListFilterInput = {
  search?: string;
  project?: string;
  detail?: string;
  stage?: string;
  status?: string;
};

const detailAllowed = ["active", "delay", "closed", "cancelled"] as const;
const stageAllowed = [
  "pending",
  "submitted",
  "approved",
  "delayed",
  "cancelled",
] as const;

/**
 * WHERE untuk `GET /api/project_progress` (list) dan export Excel.
 */
export function buildProjectProgressListWhere(
  input: ProjectProgressListFilterInput,
): SQL | undefined {
  const conditions: SQL[] = [];

  const globalSearch = input.search?.trim();
  const project = input.project?.trim();
  const detail = input.detail?.trim();
  const stageFilter = input.stage?.trim();
  const statusFilter = input.status?.trim();

  if (globalSearch) {
    const pattern = `%${globalSearch}%`;
    const sOr = or(
      ilike(projects.projectName, pattern),
      ilike(projects.poNumber, pattern),
      ilike(projectDetails.siteName, pattern),
      ilike(projectDetails.materialName, pattern),
      ilike(projectDetails.systemkey, pattern),
    );
    if (sOr) conditions.push(sOr);
  } else {
    if (project) {
      const pattern = `%${project}%`;
      const pOr = or(
        ilike(projects.projectName, pattern),
        ilike(projects.poNumber, pattern),
      );
      if (pOr) conditions.push(pOr);
    }

    if (detail) {
      const dOr = or(
        ilike(projectDetails.siteName, `%${detail}%`),
        ilike(projectDetails.materialName, `%${detail}%`),
        ilike(projectDetails.systemkey, `%${detail}%`),
      );
      if (dOr) conditions.push(dOr);
    }
  }

  const stagePattern = stageFilter ? `%${stageFilter}%` : null;
  let stageStatusHandledWithStageFilter = false;

  if (statusFilter) {
    if (statusFilter.startsWith("detail:")) {
      const detailStatus = statusFilter.slice("detail:".length);
      if ((detailAllowed as readonly string[]).includes(detailStatus)) {
        conditions.push(
          eq(
            projectDetails.status,
            detailStatus as (typeof detailAllowed)[number],
          ),
        );
      }
    } else if (statusFilter.startsWith("stage:")) {
      const stageStatus = statusFilter.slice("stage:".length);
      if ((stageAllowed as readonly string[]).includes(stageStatus)) {
        if (stagePattern) {
          stageStatusHandledWithStageFilter = true;
          conditions.push(
            sql`exists (
              select 1 from jsonb_each(${projectProgress.stageData}) as st
              where st.key ilike ${stagePattern}
                and st.value ->> 'status' = ${stageStatus}
            )`,
          );
        } else {
          conditions.push(
            sql`exists (
              select 1 from jsonb_each(${projectProgress.stageData}) as st
              where st.value ->> 'status' = ${stageStatus}
            )`,
          );
        }
      }
    } else if ((detailAllowed as readonly string[]).includes(statusFilter)) {
      conditions.push(
        eq(
          projectDetails.status,
          statusFilter as (typeof detailAllowed)[number],
        ),
      );
    } else if ((stageAllowed as readonly string[]).includes(statusFilter)) {
      if (stagePattern) {
        stageStatusHandledWithStageFilter = true;
        conditions.push(
          sql`exists (
            select 1 from jsonb_each(${projectProgress.stageData}) as st
            where st.key ilike ${stagePattern}
              and st.value ->> 'status' = ${statusFilter}
          )`,
        );
      } else {
        conditions.push(
          sql`exists (
            select 1 from jsonb_each(${projectProgress.stageData}) as st
            where st.value ->> 'status' = ${statusFilter}
          )`,
        );
      }
    }
  }

  if (stagePattern && !stageStatusHandledWithStageFilter) {
    conditions.push(
      sql`exists (
        select 1 from jsonb_each(${projectProgress.stageData}) as st
        where st.key ilike ${stagePattern}
      )`,
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}
