import type { H3Event } from "h3";
import { hasRlsPermission, type RlsAction, type RlsResource } from "~/lib/rls";
import { errorResponse } from "~/server/utils/response";

/**
 * Project documents inherit the RLS permission of the record they belong to
 * (projects, project_financials or project_progress).
 */
export function requireProjectFileAccess(
  event: H3Event,
  refTable: RlsResource,
  actions: readonly RlsAction[],
) {
  const user = event.context.user;
  if (!user?.role) return errorResponse(event, "Forbidden", 403);

  const allowed = actions.some((action) =>
    hasRlsPermission(event.context.permissions, refTable, action, user.role),
  );

  return allowed ? null : errorResponse(event, "Forbidden", 403);
}
