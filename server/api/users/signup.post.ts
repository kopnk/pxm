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

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const actorId = event.context.user?.id;
  if (!actorId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    userSignupSchema,
    await readBody(event)
  );

  const created = await db.transaction(async (tx) => {

    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length) {
      throw createError({ statusCode: 409, statusMessage: "Email already exists" });
    }

    const passwordHash = await argon2.hash(body.password);

    const rows = await tx
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone ?? null,
        region: body.region ?? null,
        area: body.area ?? null,
        avatarUrl: body.avatarUrl ?? null,
        role: body.role ?? "staff",
        isActive: body.isActive ?? true,

        // ✅ DATABASE TIME (authoritative)
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning({ id: users.id });

    const userId = rows[0].id;

    await logAudit({
      actorId,
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