import { defineEventHandler, getCookie, setCookie } from "h3";
import { lucia } from "~/server/auth/lucia";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  console.log("===== [LOGOUT] START =====");

  const sessionId = getCookie(event, lucia.sessionCookieName);
  console.log("SESSION ID:", sessionId);

  let actorId: string | null = null;

  if (sessionId) {
    /**
     * 1. Validasi session untuk ambil user (JANGAN pakai middleware)
     */
    const { session, user } = await lucia.validateSession(sessionId);

    if (session && user) {
      actorId = user.id;

      /**
       * 2. Invalidate session
       */
      await lucia.invalidateSession(sessionId);
      console.log("SESSION INVALIDATED:", sessionId);

      /**
       * 3. Audit logout (AMAN)
       */
      await logAudit({
        actorId,
        action: "LOGOUT",
        targetTable: "users",
        targetId: actorId,
      });
    }

    /**
     * 4. Hapus cookie (selalu)
     */
    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(
      event,
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );
  }

  console.log("===== [LOGOUT] END =====");

  return successResponse(
    event,
    actorId ? "Logged out successfully" : "No active session",
    {
      sessionInvalidated: !!actorId,
      sessionId: sessionId ?? null,
    },
    200
  );
});
