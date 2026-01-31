import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userSignupSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  try {
    // ✅ VALIDASI BODY
    const body = parseBody(userSignupSchema, await readBody(event));

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)
      .then((r) => r[0]);

    if (existingUser) {
      return errorResponse(event, "Email already exists", 409);
    }

    const passwordHash = await argon2.hash(body.password);

    const inserted = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        region: body.region,
        area: body.area,
        avatarUrl: body.avatarUrl,
        role: body.role,
        isActive: body.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    await logAudit({
      actorId: event.context.user.id,
      action: "CREATE",
      targetTable: "users",
      targetId: inserted[0].id,
      newData: { email: body.email, role: body.role },
    });

    return successResponse(event, "User created successfully");
  } catch (err) {
    console.error("🔥 [SIGNUP ERROR]", err);
    return errorResponse(event, "Internal server error", 500);
  }
});
