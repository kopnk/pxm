import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = "staff",
    } = (await readBody(event)) || {};

    if (!email || !password || !firstName || !lastName) {
      return errorResponse(event, "Missing required fields", 400);
    }

    /**
     * 1. CEK EMAIL DULU
     */
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then(r => r[0]);

    if (existingUser) {
      return errorResponse(event, "Email already exists", 409);
    }

    /**
     * 2. HASH PASSWORD
     */
    const passwordHash = await argon2.hash(password);

    /**
     * 3. INSERT USER
     */
    const inserted = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    const newUserId = inserted[0].id;

    /**
     * 4. AUDIT CREATE
     */
    await logAudit({
      actorId: event.context.user.id,
      action: "CREATE",
      targetTable: "users",
      targetId: newUserId,
      newData: { email, role },
    });

    return successResponse(event, "User created successfully");
  } catch (err) {
    console.error("🔥 [SIGNUP ERROR]", err);
    return errorResponse(event, "Internal server error", 500);
  }
});
