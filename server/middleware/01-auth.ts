import { defineEventHandler, getCookie, createError } from "h3";
import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getUserPermissionsMatrix } from "~/server/utils/rlsPermissions";

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || "";

  if (!url.startsWith("/api/")) {
    return;
  }

  if (url.startsWith("/api/auth/")) {
    return;
  }

  const pathOnly = url.split("?")[0] ?? "";
  const queryString = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const pdfParams = new URLSearchParams(queryString);
  if (
    pathOnly === "/api/reports/partner-po-pdf" &&
    pdfParams.get("access")?.trim()
  ) {
    return;
  }

  const sessionId = getCookie(event, "pxm_session");
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { session, user: luciaUser } =
    await lucia.validateSession(sessionId);

  if (!session || !luciaUser) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const dbUser = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, luciaUser.id))
    .limit(1)
    .then((r) => r[0]);

  if (!dbUser || !dbUser.isActive) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  event.context.user = dbUser;
  event.context.session = session;
  event.context.permissions = await getUserPermissionsMatrix(
    dbUser.id,
    dbUser.role ?? "staff",
  );
});
