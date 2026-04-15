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

  const project = query.project?.toString().trim();
  const detail = query.detail?.toString().trim();
  const stageFilter = query.stage?.toString().trim();
  const statusFilter = query.status?.toString().trim();

  /* ================= WHERE ================= */

  const conditions = [];

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

  if (stageFilter) {
    const pattern = `%${stageFilter}%`;
    conditions.push(
      sql`exists (
        select 1 from jsonb_each(${projectProgress.stageData}) as st
        where st.key ilike ${pattern}
      )`,
    );
  }

  if (statusFilter) {
    const allowed = ["active", "delay", "closed", "cancelled"] as const;
    if ((allowed as readonly string[]).includes(statusFilter)) {
      conditions.push(
        eq(
          projectDetails.status,
          statusFilter as (typeof allowed)[number],
        ),
      );
    }
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
    page,
    limit,
    total,
    totalPages,
  });
});