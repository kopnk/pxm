import { errorResponse } from "~/server/utils/response";

export function requireRole(event: any, allowedRoles: string[]) {
  const user = event.context.user;

  if (!user || !user.role) {
    return errorResponse(event, "Forbidden", 403);
  }

  // normalisasi role
  const userRole = String(user.role).toLowerCase();
  const roles = allowedRoles.map(r => r.toLowerCase());

  if (!roles.includes(userRole)) {
    return errorResponse(event, "Forbidden", 403);
  }

  return null;
}
