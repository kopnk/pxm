import { defineEventHandler, getQuery, createError } from "h3";
import { count, desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { clients } from "~/server/db/schema/clients";
import { requireRole } from "~/server/utils/authorize";
import {
  buildProjectDetailsListWhere,
  pdCity,
  pdSub,
  pdRegion,
} from "~/server/utils/projectDetailsListWhere";
import {
  buildProjectDetailsExportAoa,
  type ProjectDetailExportRow,
} from "~/server/utils/buildProjectDetailsExportAoa";
import { projectDetailsExportQueryZ } from "~/server/validation/project_details.schema";
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

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectDetailsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    projectId: firstQuery(raw.projectId),
    status: firstQuery(raw.status),
    cityKabId: firstQuery(raw.cityKabId),
  });

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
    });
  }

  const q = parsed.data;
  const where = buildProjectDetailsListWhere({
    search: q.search,
    projectId: q.projectId,
    status: q.status,
    cityKabId: q.cityKabId,
  });

  const countRow = await db
    .select({ value: count() })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(pdCity, eq(projectDetails.cityKabId, pdCity.id))
    .leftJoin(pdSub, eq(pdCity.parentId, pdSub.id))
    .leftJoin(pdRegion, eq(pdSub.parentId, pdRegion.id))
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
      prScNumber: projects.prScNumber,
      poNumber: projects.poNumber,
      poDate: projects.poDate,
      deliveryDate: projects.deliveryDate,
      komDate: projects.komDate,
      projectName: projects.projectName,
      pm: projects.pm,
      regionName: pdRegion.name,
      subRegionName: pdSub.name,
      cityKabName: pdCity.name,
      lineNumber: projectDetails.lineNumber,
      materialId: projectDetails.materialId,
      materialName: projectDetails.materialName,
      neId: projectDetails.neId,
      systemkey: projectDetails.systemkey,
      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,
      quantity: projectDetails.quantity,
      uom: projectDetails.uom,
      unitPrice: projectDetails.unitPrice,
      totalPrice: projectDetails.totalPrice,
      picArea: projectDetails.picArea,
      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksDelay: projectDetails.remarksDelay,
      remarksCancel: projectDetails.remarksCancel,
      clientName: clients.name,
      status: projectDetails.status,
    })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(pdCity, eq(projectDetails.cityKabId, pdCity.id))
    .leftJoin(pdSub, eq(pdCity.parentId, pdSub.id))
    .leftJoin(pdRegion, eq(pdSub.parentId, pdRegion.id))
    .where(where)
    .orderBy(desc(projectDetails.createdAt), desc(projectDetails.id));

  const exportRows: ProjectDetailExportRow[] = rows.map((row) => ({
    contractNumber: row.contractNumber,
    prScNumber: row.prScNumber,
    poNumber: row.poNumber,
    poDate: toLocalDate(row.poDate ?? null),
    deliveryDate: toLocalDate(row.deliveryDate ?? null),
    komDate: toLocalDate(row.komDate ?? null),
    projectName: row.projectName,
    regionName: row.regionName,
    subRegionName: row.subRegionName,
    cityKabName: row.cityKabName,
    lineNumber: row.lineNumber,
    materialId: row.materialId,
    materialName: row.materialName,
    neId: row.neId,
    systemkey: row.systemkey,
    siteId: row.siteId,
    siteName: row.siteName,
    quantity: row.quantity,
    uom: row.uom,
    unitPrice: row.unitPrice,
    totalPrice: row.totalPrice,
    picArea: row.picArea,
    pm: row.pm,
    remarksProjectsDetails: row.remarksProjectsDetails,
    remarksDelay: row.remarksDelay,
    remarksCancel: row.remarksCancel,
    clientName: row.clientName,
    status: row.status,
  }));

  const matrix = buildProjectDetailsExportAoa(exportRows);
  const dateLabel = toLocalDate(new Date()) ?? "export";

  return successResponse(event, "Project details export matrix ready", {
    matrix,
    suggestedFileName: `project-details-${dateLabel}.xlsx`,
  });
});
