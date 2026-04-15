import { defineEventHandler, readBody, setCookie, createError } from "h3";
import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { logAudit } from "~/server/utils/audit";
import { loginSchema } from "~/server/validation/auth.schema";
import { parseBody } from "~/server/utils/zod";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {
  /**
   * 1. Validate body
   */
  const body = await readBody(event);
  const { email, password } = parseBody(loginSchema, body);

  /**
   * 2. Get user
   */
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((r) => r[0]);

  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  /**
   * 3. Verify password
   */
  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  /**
   * 4. Update last login
   */
  await db
    .update(users)
    .set({ lastLoginAt: dbTime() })
    .where(eq(users.id, user.id));

  /**
   * 5. Create session (Lucia)
   */
  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);

  setCookie(event, cookie.name, cookie.value, {
    ...cookie.attributes,
    path: "/",
  });

  /**
   * 6. Ambil created_at langsung dari DB
   */
  const dbSession = await db
    .select({
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.id, session.id))
    .limit(1)
    .then((r) => r[0]);

  /**
   * 7. Audit
   */
  await logAudit({
    actorId: user.id,
    action: "LOGIN",
    targetTable: "users",
    targetId: user.id,
  });

  /**
   * 8. Response
   */
  return successResponse(event, "Login successful", {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    session: {
      id: session.id,
      createdAt: toLocalTime(dbSession?.createdAt),
      expiresAt: toLocalTime(session.expiresAt),
    },
  });
});