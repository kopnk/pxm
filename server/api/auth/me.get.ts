import { defineEventHandler, getCookie } from "h3";
import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { getUserPermissionsMatrix } from "~/server/utils/rlsPermissions";

export default defineEventHandler(async (event) => {
 // console.log("🎯 [/api/auth/me] START");

  /**
   * 1. Ambil session cookie
   */
  const sessionId = getCookie(event, lucia.sessionCookieName);
 // console.log("🍪 Session ID:", sessionId);

  if (!sessionId) {
  //  console.log("❌ No session cookie");
    return errorResponse(event, "Unauthorized - No session", 401);
  }

  /**
   * 2. Validasi session
   */
  //console.log("🔐 Validating session...");
  const { session, user: luciaUser } = await lucia.validateSession(sessionId);

 // console.log("SESSION VALID:", !!session, "USER VALID:", !!luciaUser);

  if (!session || !luciaUser) {
    //console.log("❌ Invalid session");
    return errorResponse(event, "Unauthorized - Invalid session", 401);
  }

  /**
   * 3. Ambil user dari DB
   */
  //console.log("📋 Query user:", luciaUser.id);

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, luciaUser.id))
    .limit(1)
    .then((r) => r[0]);

  if (!user) {
    //console.log("❌ User not found in DB");
    return errorResponse(event, "User not found", 404);
  }

  /**
   * 4. Convert datetime → WIB
   */
  const permissions = await getUserPermissionsMatrix(
    user.id,
    user.role ?? "staff",
  );

  const dbSession = await db
    .select({ createdAt: sessions.createdAt })
    .from(sessions)
    .where(eq(sessions.id, session.id))
    .limit(1)
    .then((rows) => rows[0]);

  const formattedUser = {
    ...user,
    createdAt: toLocalTime(user.createdAt),
    updatedAt: toLocalTime(user.updatedAt),
    lastLoginAt: toLocalTime(user.lastLoginAt),
    permissions,
  };

  /**
   * 5. Response sukses
   */
 // console.log("✅ /api/auth/me SUCCESS:", user.email);

  return successResponse(event, "Authenticated", {
    user: formattedUser,
    permissions,
    session: {
      id: session.id,
      createdAt: toLocalTime(dbSession?.createdAt),
      expiresAt: toLocalTime(session.expiresAt),
    },
  });
});
