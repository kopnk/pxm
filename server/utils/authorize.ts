import type { H3Event } from "h3";
import { errorResponse } from "~/server/utils/response";

export function requireRole(event: H3Event, allowedRoles: string[]) {
  const user = event.context.user as { role?: string } | undefined;

  if (!user || !user.role) {
    return errorResponse(event, "Forbidden", 403);
  }

  const userRole = String(user.role).toLowerCase();
  const roles = allowedRoles.map((r) => r.toLowerCase());

  if (!roles.includes(userRole)) {
    return errorResponse(event, "Forbidden", 403);
  }

  return null;
}
