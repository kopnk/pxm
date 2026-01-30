import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const authRole = event.context.user.role;
  const id = event.context.params.id;

  const selectFields =
    authRole === "superadmin"
      ? {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          region: users.region,
          area: users.area,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      : {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        };

  const user = await db
    .select(selectFields)
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!user) {
    return errorResponse(event, "User not found", 404);
  }

  return successResponse(event, "User retrieved", {
    ...user,
    createdAt: toLocalTime(user.createdAt),
    updatedAt: toLocalTime(user.updatedAt),
    lastLoginAt: user.lastLoginAt
      ? toLocalTime(user.lastLoginAt)
      : null,
  });
});
