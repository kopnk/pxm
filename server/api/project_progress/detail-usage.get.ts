import { defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { listProjectProgressUsage } from "~/server/utils/projectProgressStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const projectId = String(query.projectId ?? "").trim();
  const excludeProgressId = String(query.excludeProgressId ?? "").trim();

  const usage = await listProjectProgressUsage({
    projectId: projectId || undefined,
    excludeProgressId: excludeProgressId || undefined,
  });

  return successResponse(event, "Project progress detail usage retrieved", {
    projectDetailIds: usage.map((item) => item.projectDetailId),
  });
});
