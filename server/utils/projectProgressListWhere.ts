import type { SQL } from "drizzle-orm";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { buildSearchOr } from "~/server/utils/searchAmountSql";

export type StageDateTypeFilter = "planned" | "actual";

export type ProjectProgressListFilterInput = {
  search?: string;
  project?: string;
  detail?: string;
  stage?: string;
  /** Hanya baris yang punya plan / actual date terisi di stage terpilih */
  stageDateType?: StageDateTypeFilter;
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

function normalizeStageDateType(
  value?: string,
): StageDateTypeFilter | undefined {
  const v = value?.trim().toLowerCase();
  if (v === "planned" || v === "actual") return v;
  return undefined;
}

const hasPlanDate = sql`coalesce(trim(st.value ->> 'plan_submit_date'), '') <> ''`;
const hasActualDate = sql`coalesce(trim(st.value ->> 'actual_approve_date'), '') <> ''`;

function stageExistsCondition(
  stageKey: string,
  options?: {
    status?: string;
    stageDateType?: StageDateTypeFilter;
  },
): SQL {
  const parts: SQL[] = [sql`st.key = ${stageKey}`];

  if (options?.status) {
    parts.push(sql`st.value ->> 'status' = ${options.status}`);
  }
  if (options?.stageDateType === "planned") {
    parts.push(hasPlanDate);
  }
  if (options?.stageDateType === "actual") {
    parts.push(hasActualDate);
  }

  return sql`exists (
    select 1 from jsonb_each(${projectProgress.stageData}) as st
    where ${and(...parts)}
  )`;
}

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
  const stageCode = input.stage?.trim();
  const stageDateType = normalizeStageDateType(input.stageDateType);
  const statusFilter = input.status?.trim();

  if (globalSearch) {
    const sOr = buildSearchOr(globalSearch, {
      ilike: [
        projects.projectName,
        projects.poNumber,
        projects.contractNumber,
        projectDetails.siteName,
        projectDetails.materialName,
        projectDetails.systemkey,
        projectDetails.siteId,
        projectDetails.neId,
        projectDetails.materialId,
      ],
      asText: [
        projectDetails.lineNumber,
        projectDetails.quantity,
        projectDetails.unitPrice,
        projectDetails.totalPrice,
        projectProgress.stageData,
      ],
    });
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

  let stageFilterHandled = false;

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
        if (stageCode) {
          stageFilterHandled = true;
          conditions.push(
            stageExistsCondition(stageCode, {
              status: stageStatus,
              stageDateType,
            }),
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
      if (stageCode) {
        stageFilterHandled = true;
        conditions.push(
          stageExistsCondition(stageCode, {
            status: statusFilter,
            stageDateType,
          }),
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

  if (stageCode && !stageFilterHandled) {
    conditions.push(
      stageExistsCondition(stageCode, {
        stageDateType,
      }),
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}
