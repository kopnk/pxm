import { defineEventHandler, readBody, deleteCookie } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse, errorResponse } from "~/server/utils/response";
import { lucia } from "~/server/auth/lucia";
import { changePasswordSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  console.log("===== [CHANGE PASSWORD] START =====");

  /**
   * 1. Auth user (middleware)
   */
  const authUser = event.context.user;
  if (!authUser?.id) {
    return errorResponse(event, "Unauthorized", 401);
  }

  /**
   * 2. Validasi body (Zod)
   */
  const body = await readBody(event);
  const { currentPassword, newPassword } = parseBody(
    changePasswordSchema,
    body
  );

  /**
   * 3. Ambil user dari DB
   */
  const user = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)
    .then((r) => r[0]);

  if (!user) {
    return errorResponse(event, "User not found", 404);
  }

  /**
   * 4. Verifikasi password lama
   */
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    return errorResponse(event, "Current password is incorrect", 400);
  }

  /**
   * 5. Hash password baru
   */
  const newPasswordHash = await argon2.hash(newPassword);

  /**
   * 6. Update password
   */
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(), // UTC
    })
    .where(eq(users.id, authUser.id));

  /**
   * 7. Audit
   */
  await logAudit({
    actorId: authUser.id,
    action: "CHANGE_PASSWORD",
    targetTable: "users",
    targetId: authUser.id,
  });

  /**
   * 8. Auto logout semua session
   */
  await lucia.invalidateUserSessions(authUser.id);

  /**
   * 9. Hapus cookie session client
   */
  deleteCookie(event, lucia.sessionCookieName);

  return successResponse(
    event,
    "Password changed successfully. Please login again."
  );
});
