import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";

import { projectDetails } from "~/server/db/schema/project_details";
import { projects } from "~/server/db/schema/projects";
import { regions } from "~/server/db/schema/regions";
import { users } from "~/server/db/schema/users";

import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  /* ================= AUTH ================= */
  const forbidden = requireRole(event, [
    "superadmin",
    "admin",
    "staff",
  ]);
  if (forbidden) return forbidden;

  /* ================= PARAM ================= */
  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid ID",
    });
  }

  /* ================= REGION ALIAS ================= */
  const city = alias(regions, "city");
  const sub = alias(regions, "sub");
  const region = alias(regions, "region");

  /* ================= QUERY ================= */
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

      createdUser: projectDetails.createdUser,
      createdAt: projectDetails.createdAt,
      updatedAt: projectDetails.updatedAt,

      /* ===== Project Info ===== */
      projectName: projects.projectName,
      poNumber: projects.poNumber,

      /* ===== Region Hierarchy ===== */
      cityKabName: city.name,
      subRegionName: sub.name,
      regionName: region.name,

      subRegionId: sub.id,
      regionId: region.id,

      /* ===== Audit ===== */
      createdBy: users.firstName,
    })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
    .leftJoin(users, eq(projectDetails.createdUser, users.id))
    .where(eq(projectDetails.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project detail not found",
    });
  }

  /* ================= NORMALIZE DATA ================= */
  const data = {
    ...row,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unitPrice: row.unitPrice != null ? Number(row.unitPrice) : null,
    totalPrice: row.totalPrice != null ? Number(row.totalPrice) : null,
    taxOut: row.taxOut != null ? Number(row.taxOut) : null,
    createdAt: row.createdAt ? toLocalTime(row.createdAt) : null,
    updatedAt: row.updatedAt ? toLocalTime(row.updatedAt) : null,
  };

  /* ================= RESPONSE ================= */
  return successResponse(
    event,
    "Project detail retrieved",
    data
  );
});
