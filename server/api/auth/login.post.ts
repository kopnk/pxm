import { defineEventHandler, readBody, setCookie, createError } from "h3";
import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { logAudit } from "~/server/utils/audit";
import { loginSchema } from "~/server/validation/auth.schema";
import { parseBody } from "~/server/utils/zod";

export default defineEventHandler(async (event) => {
  /**
   * 1. Validasi body (Zod)
   */
  const body = await readBody(event);
  const { email, password } = parseBody(loginSchema, body);

  /**
   * 2. Ambil user
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

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  if (!user.isActive) {
    throw createError({ statusCode: 403, statusMessage: "User is inactive" });
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
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  /**
   * 5. Create session
   */
  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);

  setCookie(event, cookie.name, cookie.value, {
    ...cookie.attributes,
    path: "/",
    sameSite: "lax",
    secure: false,
  });

  /**
   * 6. Audit
   */
  await logAudit({
    actorId: user.id,
    action: "LOGIN",
    targetTable: "users",
    targetId: user.id,
  });

  /**
   * 7. Response
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
      createdAt: toLocalTime(session.createdAt),
      expiresAt: toLocalTime(session.expiresAt),
    },
  });
});
