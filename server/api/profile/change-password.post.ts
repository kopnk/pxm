import { defineEventHandler, readBody, createError, deleteCookie } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse } from "~/server/utils/response";
import { lucia } from "~/server/auth/lucia";
import { changePasswordSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const authUser = event.context.user;

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= VALIDATION ================= */
  const body = await readBody(event);
  const { currentPassword, newPassword } = parseBody(
    changePasswordSchema,
    body
  );

  /* ================= GET USER ================= */
  const rows = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const user = rows[0];

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  /* ================= VERIFY OLD PASSWORD ================= */
  const valid = await argon2.verify(
    user.passwordHash,
    currentPassword
  );

  if (!valid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Current password is incorrect",
    });
  }

  /* ================= HASH NEW PASSWORD ================= */
  const newPasswordHash = await argon2.hash(newPassword);

  /* ================= UPDATE + AUDIT (TRANSACTION) ================= */
  await db.transaction(async (tx) => {

    await tx
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: dbTime(),
      })
      .where(eq(users.id, authUser.id));

    await logAudit({
      actorId: authUser.id,
      action: "CHANGE_PASSWORD",
      targetTable: "users",
      targetId: authUser.id,
    });
  });

  /* ================= INVALIDATE SESSION ================= */
  await lucia.invalidateUserSessions(authUser.id);

  deleteCookie(event, lucia.sessionCookieName);

  return successResponse(
    event,
    "Password changed successfully. Please login again."
  );
});
