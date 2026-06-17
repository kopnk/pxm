import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectDetails } from "~/server/db/schema/project_details";
import { projectProgress } from "~/server/db/schema/project_progress";
import { regions } from "~/server/db/schema/regions";

import { parseBody } from "~/server/utils/zod";
import {
  updateProjectDetailSchema,
  type UpdateProjectDetailInput,
} from "~/server/validation/project_details.schema";

import { and, eq, ne } from "drizzle-orm";
import { dbTime } from "~/server/utils/dbTime";
import { requireFirstRow } from "~/server/utils/requireFirstRow";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mergePgNumeric, numToPgString } from "~/server/utils/pgNumeric";

export default defineEventHandler(async (event) => {
  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= PARAM ================= */
  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid ID",
    });
  }

  /* ================= BODY ================= */
  const body = parseBody(
    updateProjectDetailSchema,
    await readBody(event)
  ) as UpdateProjectDetailInput;

  /* ================= OLD DATA ================= */
  const oldRows = await db
    .select()
    .from(projectDetails)
    .where(eq(projectDetails.id, id))
    .limit(1);

  const oldData = oldRows[0];

  if (!oldData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project detail not found",
    });
  }

  /* ================= VALIDATE city_kab IF UPDATED ================= */
  if (
    body.cityKabId !== undefined &&
    body.cityKabId !== oldData.cityKabId
  ) {
    const city = await db
      .select({
        id: regions.id,
        type: regions.type,
      })
      .from(regions)
      .where(eq(regions.id, body.cityKabId))
      .limit(1);

    if (!city[0] || city[0].type !== "city_kab") {
      throw createError({
        statusCode: 400,
        statusMessage: "Only city_kab type allowed",
      });
    }
  }

  /* ================= VALIDATE systemkey IF UPDATED ================= */
  if (
    body.systemkey !== undefined &&
    body.systemkey.trim() !== oldData.systemkey
  ) {
    const duplicateRows = await db
      .select({ id: projectDetails.id })
      .from(projectDetails)
      .where(
        and(
          eq(projectDetails.systemkey, body.systemkey.trim()),
          ne(projectDetails.id, id),
        ),
      )
      .limit(1);

    if (duplicateRows[0]) {
      throw createError({
        statusCode: 400,
        statusMessage: "Systemkey already exists",
      });
    }
  }

  /* ================= BUSINESS LOGIC ================= */

  const quantityNum =
    body.quantity !== undefined
      ? body.quantity != null
        ? Number(body.quantity)
        : null
      : oldData.quantity != null
        ? Number(oldData.quantity)
        : null;

  const unitPriceNum =
    body.unitPrice !== undefined
      ? body.unitPrice != null
        ? Number(body.unitPrice)
        : null
      : oldData.unitPrice != null
        ? Number(oldData.unitPrice)
        : null;

  let totalPriceNum: number | null = null;

  if (quantityNum != null && unitPriceNum != null) {
    totalPriceNum = quantityNum * unitPriceNum;
  }

  /* ================= BUILD UPDATE OBJECT ================= */

  const updateData = {
    projectId:
      body.projectId !== undefined
        ? body.projectId
        : oldData.projectId,

    cityKabId:
      body.cityKabId !== undefined
        ? body.cityKabId
        : oldData.cityKabId,

    systemkey:
      body.systemkey !== undefined
        ? body.systemkey.trim()
        : oldData.systemkey,

    neId:
      body.neId !== undefined
        ? body.neId?.trim() ?? null
        : oldData.neId,

    materialId:
      body.materialId !== undefined
        ? body.materialId
        : oldData.materialId,

    materialName:
      body.materialName !== undefined
        ? body.materialName
        : oldData.materialName,

    siteId:
      body.siteId !== undefined
        ? body.siteId
        : oldData.siteId,

    siteName:
      body.siteName !== undefined
        ? body.siteName
        : oldData.siteName,

    picArea:
      body.picArea !== undefined
        ? body.picArea
        : oldData.picArea,

    lineNumber:
      body.lineNumber !== undefined
        ? body.lineNumber
        : oldData.lineNumber,

    quantity: numToPgString(quantityNum, 2),
    uom:
      body.uom !== undefined
        ? body.uom
        : oldData.uom,

    unitPrice: numToPgString(unitPriceNum, 2),
    totalPrice: numToPgString(totalPriceNum, 2),

    status:
      body.status !== undefined
        ? body.status
        : oldData.status,

    remarksProjectsDetails:
      body.remarksProjectsDetails !== undefined
        ? body.remarksProjectsDetails
        : oldData.remarksProjectsDetails,

    remarksDelay:
      body.remarksDelay !== undefined
        ? body.remarksDelay
        : oldData.remarksDelay,

    remarksCancel:
      body.remarksCancel !== undefined
        ? body.remarksCancel
        : oldData.remarksCancel,

    taxOut: mergePgNumeric(body.taxOut, oldData.taxOut, 4),

    updatedUser: userId,
    updatedAt: dbTime(),
  };

  /* ================= UPDATE ================= */

  const updatedRows = await db
    .update(projectDetails)
    .set(updateData)
    .where(eq(projectDetails.id, id))
    .returning();

  const updated = requireFirstRow(updatedRows, "Project detail not found");

  /* ================= SYNC PROJECT PROGRESS PROJECT ID =================
     Jika detail dipindah ke project lain, progress terkait harus ikut.
  ==================================================================== */
  if (updated.projectId !== oldData.projectId) {
    await db
      .update(projectProgress)
      .set({
        projectId: updated.projectId,
        updatedUser: userId,
        updatedAt: dbTime(),
      })
      .where(eq(projectProgress.projectDetailId, id));
  }

  /* ================= AUDIT ================= */

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "project_details",
    targetId: id,
    oldData,
    newData: updated,
  });

  /* ================= RESPONSE ================= */

  return successResponse(
    event,
    "Project detail updated",
    {
      ...mapLocalTimestamps(updated),
      quantity: updated.quantity != null ? Number(updated.quantity) : null,
      unitPrice: updated.unitPrice != null ? Number(updated.unitPrice) : null,
      totalPrice: updated.totalPrice != null ? Number(updated.totalPrice) : null,
      taxOut: updated.taxOut != null ? Number(updated.taxOut) : null,
    },
  );
});
