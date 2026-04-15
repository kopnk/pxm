import type { H3Event } from "h3";
import { requireRole } from "~/server/utils/authorize";

export function requireDeleteSuperadmin(event: H3Event) {
  return requireRole(event, ["superadmin"]);
}
