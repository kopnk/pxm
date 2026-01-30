import { defineEventHandler, readBody, setCookie, createError } from "h3";
import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  /**
   * 1. Read body
   */
  const { email, password } = (await readBody(event)) ?? {};

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email and password are required",
    });
  }

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
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: "User is inactive",
    });
  }

  /**
   * 3. Verify password
   */
  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  /**
   * 4. Update last_login_at (UTC ONLY)
   * ❗ JANGAN update updated_at
   */
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(), // UTC
    })
    .where(eq(users.id, user.id));

  /**
   * 5. Create session (Lucia)
   */
  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);

setCookie(event, cookie.name, cookie.value, {
  ...cookie.attributes,
  path: "/",               // WAJIB
  sameSite: "lax",          // eksplisit
  secure: false,            // localhost
});


  /**
   * 6. Audit LOGIN
   */
  await logAudit({
    actorId: user.id,
    action: "LOGIN",
    targetTable: "users",
    targetId: user.id,
  });

  /**
   * 7. Response (WIB)
   */
  return successResponse(
    event,
    "Login successful",
    {
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
      cookie: {
        name: cookie.name,
        attributes: cookie.attributes,
      },
    },
    200
  );
});
