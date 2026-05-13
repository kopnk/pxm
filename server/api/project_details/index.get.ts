import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";

import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { users } from "~/server/db/schema/users";

import { count, eq, desc } from "drizzle-orm";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import {
  buildPagination,
  buildTotalPages,
} from "~/server/utils/pagination";
import {
  buildProjectDetailsListWhere,
  pdCity,
  pdSub,
  pdRegion,
} from "~/server/utils/projectDetailsListWhere";

export default defineEventHandler(async (event) => {
  /* ================= AUTH ================= */
  const forbidden = requireRole(event, [
    "superadmin",
    "admin",
    "staff",
  ]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */
  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const search = query.search?.toString().trim();
  const projectId = query.projectId?.toString().trim();
  const status = query.status?.toString().trim();
  const cityKabId = query.cityKabId?.toString().trim();

  const where = buildProjectDetailsListWhere({
    search: search || undefined,
    projectId: projectId || undefined,
    status: status || undefined,
    cityKabId: cityKabId || undefined,
  });

  /* ================= COUNT ================= */
  const totalResult = await db
    .select({ value: count() })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(pdCity, eq(projectDetails.cityKabId, pdCity.id))
    .leftJoin(pdSub, eq(pdCity.parentId, pdSub.id))
    .leftJoin(pdRegion, eq(pdSub.parentId, pdRegion.id))
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */
  const rows = await db
    .select({
      id: projectDetails.id,
      projectId: projectDetails.projectId,
      cityKabId: projectDetails.cityKabId,

      lineNumber: projectDetails.lineNumber,

      systemkey: projectDetails.systemkey,
      neId: projectDetails.neId,

      materialId: projectDetails.materialId,
      materialName: projectDetails.materialName,

      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,

      picArea: projectDetails.picArea,

      quantity: projectDetails.quantity,
      uom: projectDetails.uom,

      unitPrice: projectDetails.unitPrice,
      totalPrice: projectDetails.totalPrice,

      status: projectDetails.status,

      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksDelay: projectDetails.remarksDelay,
      remarksCancel: projectDetails.remarksCancel,
      taxOut: projectDetails.taxOut,

      createdAt: projectDetails.createdAt,
      updatedAt: projectDetails.updatedAt,

      projectName: projects.projectName,
      poNumber: projects.poNumber,

      cityKabName: pdCity.name,
      subRegionName: pdSub.name,
      regionName: pdRegion.name,

      createdUser: projectDetails.createdUser,
      createdBy: users.firstName,
    })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(pdCity, eq(projectDetails.cityKabId, pdCity.id))
    .leftJoin(pdSub, eq(pdCity.parentId, pdSub.id))
    .leftJoin(pdRegion, eq(pdSub.parentId, pdRegion.id))
    .leftJoin(users, eq(projectDetails.createdUser, users.id))
    .where(where)
    .orderBy(desc(projectDetails.createdAt), desc(projectDetails.id))
    .limit(limit)
    .offset(offset);

  /* ================= MAP DATA ================= */
  const items = rows.map((row) => ({
    ...row,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unitPrice: row.unitPrice != null ? Number(row.unitPrice) : null,
    totalPrice: row.totalPrice != null ? Number(row.totalPrice) : null,
    taxOut: row.taxOut != null ? Number(row.taxOut) : null,
    createdAt: row.createdAt ? toLocalTime(row.createdAt) : null,
    updatedAt: row.updatedAt ? toLocalTime(row.updatedAt) : null,
  }));

  /* ================= RESPONSE ================= */
  return successResponse(event, "Project details retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
