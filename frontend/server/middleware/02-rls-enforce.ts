import { defineEventHandler } from "h3";
import { hasRlsPermission } from "~/lib/rls";
import { isRlsExemptApiPath, resolveApiAccess } from "~/server/utils/apiAccessMap";
import { isPublicApiPath, requestMethod, resolveApiPath } from "~/server/utils/apiPath";
import { errorResponse } from "~/server/utils/response";

export default defineEventHandler((event) => {
  const path = resolveApiPath(event);
  if (!path || isPublicApiPath(path)) return;

  if (path === "/api/reports/partner-po-pdf" && event.context.signedPartnerPoPdfAccess) {
    return;
  }

  // These handlers enforce their own role/resource checks.
  if (isRlsExemptApiPath(path)) return;

  const user = event.context.user;
  if (!user?.role) {
    return errorResponse(event, "Forbidden", 403);
  }

  const access = resolveApiAccess(path, requestMethod(event));

  // Fail closed: an endpoint without an RLS rule is not reachable.
  if (!access) {
    return errorResponse(event, "Forbidden", 403);
  }

  if (user.role.toLowerCase() === "superadmin") {
    event.context.rlsEnforced = true;
    return;
  }

  if (!hasRlsPermission(event.context.permissions, access.resource, access.action, user.role)) {
    return errorResponse(event, "Forbidden", 403);
  }

  event.context.rlsEnforced = true;
});
