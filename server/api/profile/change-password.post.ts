import { defineEventHandler, readBody, getCookie, deleteCookie } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse, errorResponse } from "~/server/utils/response";
import { lucia } from "~/server/auth/lucia";

export default defineEventHandler(async (event) => {
  console.log("===== [CHANGE PASSWORD] START =====");

  try {
    /**
     * 1. Auth user (dari middleware)
     */
    const authUser = event.context.user;
    console.log("AUTH USER:", authUser?.id);

    if (!authUser?.id) {
      return errorResponse(event, "Unauthorized", 401);
    }

    /**
     * 2. Read body
     */
    const { currentPassword, newPassword, confirmPassword } =
      (await readBody(event)) || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return errorResponse(
        event,
        "currentPassword, newPassword, and confirmPassword are required",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return errorResponse(event, "Password confirmation does not match", 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(
        event,
        "New password must be at least 8 characters",
        400
      );
    }

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
     * 6. Update password (DB tetap UTC)
     */
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.id));

  await logAudit({
  actorId: authUser.id,
  action: "CHANGE_PASSWORD",
  targetTable: "users",
  targetId: authUser.id,
});

    /**
     * 7. AUTO LOGOUT SEMUA SESSION USER
     * (TERMASUK SESSION SAAT INI)
     */
    await lucia.invalidateUserSessions(authUser.id);
    console.log("🚪 ALL USER SESSIONS INVALIDATED");

    /**
     * 8. Hapus cookie session di client (current device)
     */
    const sessionCookieName = lucia.sessionCookieName;
    deleteCookie(event, sessionCookieName);

    /**
     * 9. Response sukses
     */
    return successResponse(
      event,
      "Password changed successfully. Please login again."
    );

  } catch (err) {
    console.error("🔥 [CHANGE PASSWORD ERROR]", err);
    return errorResponse(event, "Internal server error", 500);
  } finally {
    console.log("===== [CHANGE PASSWORD] END =====");
  }
});
