import { defineEventHandler, getCookie, setCookie } from "h3";
import { lucia } from "~/server/auth/lucia";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName);

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
      /**
       * 3. Audit logout (AMAN)
       */
      await logAudit({
        event,
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

  return successResponse(
    event,
    actorId ? "Logged out successfully" : "No active session",
    {
      sessionInvalidated: !!actorId,
    },
    200
  );
});
