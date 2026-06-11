import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userSignupSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";
import { dbTime } from "~/server/utils/dbTime";
import { requireFirstRow } from "~/server/utils/requireFirstRow";
import { ensureUserPermissionsForRole } from "~/server/utils/rlsPermissions";
import { DEFAULT_USER_PASSWORD } from "~/lib/authDefaults";
import { assertCreatableUserRole } from "~/server/utils/userRolePolicy";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    userSignupSchema,
    await readBody(event)
  );

  assertCreatableUserRole(actor.role, body.role ?? "staff");

  const created = await db.transaction(async (tx) => {

    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length) {
      throw createError({ statusCode: 409, statusMessage: "Email already exists" });
    }

    const passwordHash = await argon2.hash(DEFAULT_USER_PASSWORD);

    const rows = await tx
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        region: body.region,
        area: body.area,
        avatarUrl: body.avatarUrl ?? null,
        role: body.role ?? "staff",
        isActive: body.isActive ?? true,
        mustChangePassword: true,
        createdUser: actor.id,
        updatedUser: actor.id,

        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning({ id: users.id });

    const userId = requireFirstRow(rows, "User not created").id;
    const role = body.role ?? "staff";

    await ensureUserPermissionsForRole(userId, role, tx);

    await logAudit({
      event,
      actorId: actor.id,
      action: "CREATE",
      targetTable: "users",
      targetId: userId,
      newData: { email: body.email, role: body.role },
    });

    return userId;
  });

  return successResponse(
    event,
    "User created successfully",
    { id: created },
    201
  );
});