import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";

import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { regions } from "~/server/db/schema/regions";
import { users } from "~/server/db/schema/users";

import {
  ilike,
  count,
  and,
  or,
  eq,
  desc,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import {
  buildPagination,
  buildTotalPages,
} from "~/server/utils/pagination";

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
  const projectId = query.projectId?.toString();
  const status = query.status?.toString();
  const cityKabId = query.cityKabId?.toString();

  /* ================= REGION ALIAS ================= */
  const city = alias(regions, "city");
  const sub = alias(regions, "sub");
  const region = alias(regions, "region");

  /* ================= WHERE BUILDER ================= */
  const conditions = [];

  if (search) {
    conditions.push(
      or(
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
        ilike(city.name, `%${search}%`),      // ✅ cityKab
        ilike(sub.name, `%${search}%`),       // ✅ sub region
        ilike(region.name, `%${search}%`)     // ✅ region
      )
    );
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

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= COUNT ================= */
  const totalResult = await db
    .select({ value: count() })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
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

      cityKabName: city.name,      // ✅ FE pakai ini
      subRegionName: sub.name,
      regionName: region.name,

      createdUser: projectDetails.createdUser,
      createdBy: users.firstName,
    })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
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
