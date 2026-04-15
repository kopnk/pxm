import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = rows[0];

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return successResponse(event, "User retrieved", {
    ...user,
    createdAt: toLocalTime(user.createdAt),
    updatedAt: toLocalTime(user.updatedAt),
    lastLoginAt: user.lastLoginAt ? toLocalTime(user.lastLoginAt) : null,
  });
});
