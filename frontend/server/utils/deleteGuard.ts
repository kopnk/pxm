import type { H3Event } from "h3";
import { requireRole } from "~/server/utils/authorize";

export function requireDeleteSuperadmin(event: H3Event) {
  if (event.context.rlsEnforced) return null;
  return requireRole(event, ["superadmin"]);
}
