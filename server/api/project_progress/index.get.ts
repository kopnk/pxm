import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";

import { projectProgress } from "~/server/db/schema/project_progress";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";

import {
  and,
  or,
  eq,
  ilike,
  count,
  desc,
  sql,
} from "drizzle-orm";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const globalSearch = query.search?.toString().trim();
  const project = query.project?.toString().trim();
  const detail = query.detail?.toString().trim();
  const stageFilter = query.stage?.toString().trim();
  const statusFilter = query.status?.toString().trim();

  /* ================= WHERE ================= */

  const conditions = [];

  if (globalSearch) {
    const pattern = `%${globalSearch}%`;
    conditions.push(
      or(
        ilike(projects.projectName, pattern),
        ilike(projects.poNumber, pattern),
        ilike(projectDetails.siteName, pattern),
        ilike(projectDetails.materialName, pattern),
        ilike(projectDetails.systemkey, pattern),
      ),
    );
  } else {
    if (project) {
      const pattern = `%${project}%`;
      conditions.push(
        or(
          ilike(projects.projectName, pattern),
          ilike(projects.poNumber, pattern),
        ),
      );
    }

    if (detail) {
      conditions.push(
        or(
          ilike(projectDetails.siteName, `%${detail}%`),
          ilike(projectDetails.materialName, `%${detail}%`),
          ilike(projectDetails.systemkey, `%${detail}%`),
        ),
      );
    }
  }

  const stagePattern = stageFilter ? `%${stageFilter}%` : null;
  let stageStatusHandledWithStageFilter = false;

  if (statusFilter) {
    const detailAllowed = ["active", "delay", "closed", "cancelled"] as const;
    const stageAllowed = [
      "pending",
      "submitted",
      "approved",
      "delayed",
      "cancelled",
    ] as const;

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

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= COUNT ================= */

  const totalResult = await db
    .select({ value: count() })
    .from(projectProgress)
    .leftJoin(projects, eq(projects.id, projectProgress.projectId))
    .leftJoin(projectDetails, eq(projectDetails.id, projectProgress.projectDetailId))
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */

  const stageRows = await db
    .select({
      stageData: projectProgress.stageData,
    })
    .from(projectProgress)
    .leftJoin(projects, eq(projects.id, projectProgress.projectId))
    .leftJoin(projectDetails, eq(projectDetails.id, projectProgress.projectDetailId))
    .where(where);

  const stageCounts: Record<string, { plan: number; actual: number }> = {};

  for (const row of stageRows) {
    const stageData = (row.stageData ?? {}) as Record<
      string,
      { plan_submit_date?: string | null; actual_approve_date?: string | null }
    >;

    for (const [code, value] of Object.entries(stageData)) {
      if (!stageCounts[code]) {
        stageCounts[code] = { plan: 0, actual: 0 };
      }

      if (String(value?.plan_submit_date ?? "").trim()) {
        stageCounts[code].plan += 1;
      }
      if (String(value?.actual_approve_date ?? "").trim()) {
        stageCounts[code].actual += 1;
      }
    }
  }

  const rows = await db
    .select({
      id: projectProgress.id,

      projectId: projectProgress.projectId,
      projectName: projects.projectName,
      poNumber: projects.poNumber,

      projectDetailId: projectProgress.projectDetailId,
      siteName: projectDetails.siteName,
      siteId: projectDetails.siteId,
      materialName: projectDetails.materialName,
      systemkey: projectDetails.systemkey,
      neId: projectDetails.neId,

      stageData: projectProgress.stageData,

      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksCancel: projectDetails.remarksCancel,

      detailStatus: projectDetails.status,

      createdAt: projectProgress.createdAt,
      updatedAt: projectProgress.updatedAt,
    })
    .from(projectProgress)
    .leftJoin(projects, eq(projects.id, projectProgress.projectId))
    .leftJoin(projectDetails, eq(projectDetails.id, projectProgress.projectDetailId))
    .where(where)
    .orderBy(desc(projectProgress.createdAt), desc(projectProgress.id))
    .limit(limit)
    .offset(offset);

  /* ================= FORMAT ================= */

  const items = rows.map((row) => {
    const stageData = Object.fromEntries(
      Object.entries((row.stageData ?? {}) as Record<string, unknown>).map(
        ([code, st]) => {
          const s = st as {
            plan_submit_date?: string | null;
            actual_approve_date?: string | null;
            status?: string | null;
          };
          return [
            code,
            {
              ...s,
              plan_submit_date: toLocalDate(s.plan_submit_date ?? null),
              actual_approve_date: toLocalDate(s.actual_approve_date ?? null),
            },
          ];
        },
      ),
    );

    return {
      id: row.id,

      projectId: row.projectId,
      projectName: row.projectName,
      poNumber: row.poNumber ?? null,

      projectDetailId: row.projectDetailId,
      siteName: row.siteName,
      siteId: row.siteId ?? null,
      materialName: row.materialName,
      systemKey: row.systemkey ?? null,
      neId: row.neId ?? null,

      stageData,

      remarksProjectsDetails: row.remarksProjectsDetails ?? null,
      remarksCancel: row.remarksCancel ?? null,

      detailStatus: row.detailStatus ?? null,

      createdAt: toLocalTime(row.createdAt),
      updatedAt: toLocalTime(row.updatedAt),
    };
  });

  /* ================= RESPONSE ================= */

  return successResponse(event, "Project progress retrieved", {
    items,
    stageCounts,
    page,
    limit,
    total,
    totalPages,
  });
});