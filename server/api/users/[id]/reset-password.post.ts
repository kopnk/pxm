import { defineEventHandler, createError } from "h3";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { DEFAULT_USER_PASSWORD } from "~/lib/authDefaults";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { assertNotSuperadminTarget } from "~/server/utils/userRolePolicy";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const targetId = event.context.params?.id;
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: "User id is required" });
  }

  const target = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  assertNotSuperadminTarget(target.role ?? "staff", "reset_password");

  const passwordHash = await argon2.hash(DEFAULT_USER_PASSWORD);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      updatedUser: actor.id,
      updatedAt: dbTime(),
    })
    .where(eq(users.id, targetId));

  await logAudit({
    event,
    actorId: actor.id,
    action: "RESET_PASSWORD",
    targetTable: "users",
    targetId: target.id,
    newData: { email: target.email },
  });

  return successResponse(event, "Password reset to default", {
    id: target.id,
    mustChangePassword: true,
  });
});
