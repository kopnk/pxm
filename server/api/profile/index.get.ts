import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const authUser = event.context.user;

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= QUERY ================= */
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      region: users.region,
      area: users.area,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
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

  /* ================= FORMAT ================= */
  return successResponse(event, "Profile retrieved", {
    ...user,
    createdAt: toLocalTime(user.createdAt),
    updatedAt: toLocalTime(user.updatedAt),
    lastLoginAt: user.lastLoginAt
      ? toLocalTime(user.lastLoginAt)
      : null,
  });
});
