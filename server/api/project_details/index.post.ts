import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectDetails } from "~/server/db/schema/project_details";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projects } from "~/server/db/schema/projects";
import { regions } from "~/server/db/schema/regions";
import { users } from "~/server/db/schema/users";
import { parseBody } from "~/server/utils/zod";
import {
  createProjectDetailBulkSchema,
  type CreateProjectDetailInput,
} from "~/server/validation/project_details.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { dbTime } from "~/server/utils/dbTime";

/* =========================================================
   🔹 SELECT BUILDER (Hierarchy Join)
========================================================= */
function buildProjectDetailSelect(tx: typeof db) {
  const city = alias(regions, "city");
  const sub = alias(regions, "sub");
  const region = alias(regions, "region");

  return tx
    .select({
      id: projectDetails.id,
      projectId: projectDetails.projectId,
      cityKabId: projectDetails.cityKabId,

      systemkey: projectDetails.systemkey,
      neId: projectDetails.neId,

      materialId: projectDetails.materialId,
      materialName: projectDetails.materialName,
      siteId: projectDetails.siteId,
      siteName: projectDetails.siteName,

      picArea: projectDetails.picArea,
      lineNumber: projectDetails.lineNumber,

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

      projectName: projects.projectName,
      poNumber: projects.poNumber,

      cityName: city.name,
      subRegionName: sub.name,
      regionName: region.name,

      createdBy: users.firstName,
    })
    .from(projectDetails)
    .leftJoin(projects, eq(projectDetails.projectId, projects.id))
    .leftJoin(city, eq(projectDetails.cityKabId, city.id))
    .leftJoin(sub, eq(city.parentId, sub.id))
    .leftJoin(region, eq(sub.parentId, region.id))
    .leftJoin(users, eq(projectDetails.createdUser, users.id));
}

export default defineEventHandler(async (event) => {
  /* ================= BODY ================= */
  const rawBody = await readBody(event);
  const isBulkPayload = Array.isArray(rawBody);

  /* ================= AUTH ================= */
  const forbidden = requireRole(
    event,
    isBulkPayload ? ["superadmin"] : ["superadmin", "admin"],
  );
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const parsed = parseBody(createProjectDetailBulkSchema, rawBody);

  const payload: CreateProjectDetailInput[] = Array.isArray(parsed)
    ? parsed
    : [parsed];

  if (!payload.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Empty payload",
    });
  }

  /* ================= DUPLICATE CHECK (PAYLOAD) ================= */
  const systemKeys = payload.map((p) => p.systemkey.trim());
  const uniqueKeys = new Set(systemKeys);

  if (uniqueKeys.size !== systemKeys.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Duplicate systemkey in payload",
    });
  }

  const result = await db.transaction(async (tx) => {
    /* ================= VALIDATE project ================= */
    const projectIds = payload.map((p) => p.projectId);
    const uniqueProjectIds = [...new Set(projectIds)];

    const existingProjects = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.id, uniqueProjectIds));

    const existingProjectIdSet = new Set(existingProjects.map((p) => p.id));
    const invalidProjectIds = uniqueProjectIds.filter(
      (id) => !existingProjectIdSet.has(id),
    );

    if (invalidProjectIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid project reference: ${invalidProjectIds.join(", ")}`,
      });
    }

    /* ================= VALIDATE city_kab ================= */
    const cityIds = payload.map((p) => p.cityKabId);
    const uniqueCityIds = [...new Set(cityIds)];

    const cities = await tx
      .select({
        id: regions.id,
        type: regions.type,
      })
      .from(regions)
      .where(inArray(regions.id, uniqueCityIds));

    if (cities.length !== uniqueCityIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid city_kab reference",
      });
    }

    const invalidType = cities.find((c) => c.type !== "city_kab");

    if (invalidType) {
      throw createError({
        statusCode: 400,
        statusMessage: "Only city_kab type allowed",
      });
    }

    /* ================= DUPLICATE CHECK (DB) ================= */
    const existing = await tx
      .select({ systemkey: projectDetails.systemkey })
      .from(projectDetails)
      .where(inArray(projectDetails.systemkey, systemKeys));

    if (existing.length) {
      throw createError({
        statusCode: 400,
        statusMessage: `Systemkey already exists: ${existing
          .map((e) => e.systemkey)
          .join(", ")}`,
      });
    }

    /* ================= INSERT ================= */
    const now = dbTime();

    const inserted = await tx
      .insert(projectDetails)
      .values(
        payload.map((item) => {
          const quantity =
            item.quantity != null ? Number(item.quantity) : null;

          const unitPrice =
            item.unitPrice != null ? Number(item.unitPrice) : null;

          const totalPrice =
            quantity != null && unitPrice != null
              ? quantity * unitPrice
              : null;

          return {
            projectId: item.projectId,
            cityKabId: item.cityKabId,

            picArea: item.picArea ?? null,
            lineNumber: item.lineNumber ?? null,

            systemkey: item.systemkey.trim(),
            neId: typeof item.neId === "string" ? item.neId.trim() : null,

            materialId: item.materialId ?? null,
            materialName: item.materialName ?? null,
            siteId: item.siteId ?? null,
            siteName: item.siteName ?? null,

            quantity,
            uom: item.uom ?? null,
            unitPrice,
            totalPrice,

            status: item.status ?? "active",

            remarksProjectsDetails:
              item.remarksProjectsDetails ?? null,
            remarksDelay: item.remarksDelay ?? null,
            remarksCancel: item.remarksCancel ?? null,

            taxOut:
              item.taxOut != null && item.taxOut !== undefined
                ? String(item.taxOut)
                : null,

            createdAt: now,
            updatedAt: now,
            createdUser: userId,
          };
        })
      )
      .returning({
        id: projectDetails.id,
        projectId: projectDetails.projectId,
      });

    /* ================= AUTO-SYNC PROJECT PROGRESS =================
       Saat detail dibuat, otomatis buat row progress dasar agar
       halaman project-progress langsung menampilkan project+detail.
    =============================================================== */
    await tx
      .insert(projectProgress)
      .values(
        inserted.map((row) => ({
          projectId: row.projectId,
          projectDetailId: row.id,
          stageData: {},
          createdUser: userId,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();

    /* ================= AUDIT ================= */
    for (const row of inserted) {
      await logAudit({
        actorId: userId,
        action: "CREATE",
        targetTable: "project_details",
        targetId: row.id,
        newData: { id: row.id },
      });
    }

    /* ================= REQUERY ================= */
    const insertedIds = inserted.map((r) => r.id);

    return await buildProjectDetailSelect(tx)
      .where(inArray(projectDetails.id, insertedIds))
      .orderBy(projectDetails.createdAt);
  });

  const data = result.map((row) => ({
    ...row,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unitPrice: row.unitPrice != null ? Number(row.unitPrice) : null,
    totalPrice: row.totalPrice != null ? Number(row.totalPrice) : null,
    taxOut: row.taxOut != null ? Number(row.taxOut) : null,
  }));

  return successResponse(
    event,
    `Project detail created (${data.length} row)`,
    data,
    201,
  );
});
