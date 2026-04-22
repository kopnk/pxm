import { defineEventHandler, readBody } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { broadcastDashboardRefresh } from "~/server/utils/dashboardRefreshHub";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const body = (await readBody(event).catch(() => ({}))) as {
    source?: string;
  };

  broadcastDashboardRefresh(body?.source ?? "dashboard_api");

  return successResponse(event, "Dashboard refresh event broadcasted", {
    source: body?.source ?? "dashboard_api",
  });
});
