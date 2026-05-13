import { defineEventHandler, getQuery, createError } from "h3";
import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projects } from "~/server/db/schema/projects";
import { projectDetails } from "~/server/db/schema/project_details";
import { regions } from "~/server/db/schema/regions";
import { requireRole } from "~/server/utils/authorize";
import { buildProjectProgressListWhere } from "~/server/utils/projectProgressListWhere";
import {
  buildProjectProgressExportAoa,
  type ProjectProgressExportRow,
} from "~/server/utils/buildProjectProgressExportAoa";
import { projectProgressExportQueryZ } from "~/server/validation/project_progress.schema";
import { toLocalDate } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";

const MAX_EXPORT_ROWS = 8000;

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  const x = Array.isArray(v) ? v[0] : v;
  const t = String(x).trim();
  return t === "" ? undefined : t;
}

function formatStageDataForExport(raw: unknown): ProjectProgressExportRow["stageData"] {
  return Object.fromEntries(
    Object.entries((raw ?? {}) as Record<string, unknown>).map(
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
  ) as ProjectProgressExportRow["stageData"];
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectProgressExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    stage: firstQuery(raw.stage),
    status: firstQuery(raw.status),
    project: firstQuery(raw.project),
    detail: firstQuery(raw.detail),
  });

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
    });
  }

  const q = parsed.data;
  const globalSearch = q.search;
  const where = buildProjectProgressListWhere({
    search: globalSearch || undefined,
    project: globalSearch ? undefined : q.project,
    detail: globalSearch ? undefined : q.detail,
    stage: q.stage,
    status: q.status,
  });

  const city = alias(regions, "pp_export_city");
  const sub = alias(regions, "pp_export_sub");
  const region = alias(regions, "pp_export_region");

  const countRow = await db
    .select({ value: count() })
    .from(projectProgress)
    .leftJoin(projects, eq(projects.id, projectProgress.projectId))
    .leftJoin(
      projectDetails,
      eq(projectDetails.id, projectProgress.projectDetailId),
    )
    .where(where);

  const total = Number(countRow[0]?.value ?? 0);
  if (total > MAX_EXPORT_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many rows (${total}). Narrow search or filters (max ${MAX_EXPORT_ROWS}).`,
    });
  }

  const rows = await db
    .select({
      contractNumber: projects.contractNumber,
      poNumber: projects.poNumber,
      poDate: projects.poDate,
      deliveryDate: projects.deliveryDate,
      komDate: projects.komDate,
      projectName: projects.projectName,
      regionName: region.name,
      subRegionName: sub.name,
      cityKabName: city.name,
      materialId: projectDetails.materialId,
      materialName: projectDetails.materialName,
      lineNumber: projectDetails.lineNumber,
      neId: projectDetails.neId,
      systemkey: projectDetails.systemkey,
      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,
      picArea: projectDetails.picArea,
      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksDelay: projectDetails.remarksDelay,
      detailStatus: projectDetails.status,
      stageData: projectProgress.stageData,
      partnerName: sql<string | null>`(
        select pr.name from project_financials pf
        inner join partners pr on pr.id = pf.partner_id
        where pf.project_detail_id = ${projectDetails.id}
          and pf.flow_direction = 'in'
        order by pf.updated_at desc nulls last
        limit 1
      )`.as("partner_name"),
    })
    .from(projectProgress)
    .leftJoin(projects, eq(projects.id, projectProgress.projectId))
    .leftJoin(
      projectDetails,
      eq(projectDetails.id, projectProgress.projectDetailId),
    )
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
    .where(where)
    .orderBy(desc(projectProgress.createdAt), desc(projectProgress.id));

  const exportRows: ProjectProgressExportRow[] = rows.map((row) => ({
    contractNumber: row.contractNumber,
    poNumber: row.poNumber,
    poDate: toLocalDate(row.poDate ?? null),
    deliveryDate: toLocalDate(row.deliveryDate ?? null),
    komDate: toLocalDate(row.komDate ?? null),
    projectName: row.projectName,
    regionName: row.regionName,
    subRegionName: row.subRegionName,
    cityKabName: row.cityKabName,
    materialId: row.materialId,
    materialName: row.materialName,
    lineNumber: row.lineNumber,
    neId: row.neId,
    systemkey: row.systemkey,
    siteId: row.siteId,
    siteName: row.siteName,
    picArea: row.picArea,
    remarksProjectsDetails: row.remarksProjectsDetails,
    remarksDelay: row.remarksDelay,
    partnerName: row.partnerName,
    detailStatus: row.detailStatus,
    stageData: formatStageDataForExport(row.stageData),
  }));

  const matrix = buildProjectProgressExportAoa(exportRows);
  const dateLabel = toLocalDate(new Date()) ?? "export";

  return successResponse(event, "Project progress export matrix ready", {
    matrix,
    suggestedFileName: `project-progress-${dateLabel}.xlsx`,
  });
});
