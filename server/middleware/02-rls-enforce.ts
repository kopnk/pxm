import { defineEventHandler } from "h3";
import { hasRlsPermission } from "~/lib/rls";
import type { RlsMatrix } from "~/lib/rls";
import { resolveApiAccess } from "~/server/utils/apiAccessMap";
import { errorResponse } from "~/server/utils/response";

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";
  if (!url.startsWith("/api/")) return;

  const access = resolveApiAccess(event);
  if (!access) return;

  const user = event.context.user as { role?: string } | undefined;
  if (!user?.role) {
    return errorResponse(event, "Forbidden", 403);
  }

  if (user.role.toLowerCase() === "superadmin") {
    event.context.rlsEnforced = true;
    return;
  }

  const matrix = event.context.permissions as RlsMatrix | undefined;

  if (
    !hasRlsPermission(matrix, access.resource, access.action, user.role)
  ) {
    return errorResponse(event, "Forbidden", 403);
  }

  event.context.rlsEnforced = true;
});
