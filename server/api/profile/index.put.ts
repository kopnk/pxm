import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { updateProfileSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

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

  /* ================= UPDATE ================= */
  const updated = await db.transaction(async (tx) => {

    const oldRows = await tx
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        region: users.region,
        area: users.area,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1);

    const oldUser = oldRows[0];

    if (!oldUser) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    const rows = await tx
      .update(users)
      .set({
        firstName: body.firstName ?? oldUser.firstName,
        lastName: body.lastName ?? oldUser.lastName,
        phone: body.phone ?? oldUser.phone,
        region: body.region ?? oldUser.region,
        area: body.area ?? oldUser.area,
        avatarUrl: body.avatarUrl ?? oldUser.avatarUrl,
        updatedAt: dbTime(),
      })
      .where(eq(users.id, actor.id))
      .returning({
        updatedAt: users.updatedAt,
      });

    await logAudit({
      actorId: actor.id,
      action: "UPDATE",
      targetTable: "users",
      targetId: actor.id,
      oldData: oldUser,
      newData: rows[0],
    });

    return rows[0];
  });

  return successResponse(event, "Profile updated successfully", {
    updatedAt: toLocalTime(updated.updatedAt),
  });
});
