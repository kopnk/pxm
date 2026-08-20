import { defineEventHandler, readBody, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { updateProfileSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";
import { logAudit } from "~/server/utils/audit";
import {
  getAppUserRecordById,
  updateAppUserRecord,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const actor = event.context.user;

  if (!actor?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= VALIDATION ================= */
  const body = parseBody(
    updateProfileSchema,
    await readBody(event)
  );

  const current = await getAppUserRecordById(actor.id);

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  const updated = await updateAppUserRecord(actor.id, {
    firstName: body.firstName ?? current.user.firstName,
    lastName: body.lastName ?? current.user.lastName,
    phone: body.phone ?? current.user.phone,
    region: body.region ?? current.user.region,
    area: body.area ?? current.user.area,
    avatarUrl: body.avatarUrl ?? current.user.avatarUrl,
    updatedUser: actor.id,
    updatedBy: actor.email,
  });

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  await logAudit({
    event,
    actorId: actor.id,
    action: "UPDATE",
    targetTable: "users",
    targetId: actor.id,
    oldData: {
      firstName: current.user.firstName,
      lastName: current.user.lastName,
      phone: current.user.phone,
      region: current.user.region,
      area: current.user.area,
      avatarUrl: current.user.avatarUrl,
    },
    newData: {
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      phone: updated.user.phone,
      region: updated.user.region,
      area: updated.user.area,
      avatarUrl: updated.user.avatarUrl,
    },
  });

  return successResponse(event, "Profile updated", {
    updatedAt: toLocalTime(updated.user.updatedAt),
  });
});
