import { defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { listRegionOptions } from "~/server/utils/regionStore";

const ALLOWED_TYPES = ["region", "sub_region"] as const;

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const type = String(query.type ?? "region");

  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return successResponse(event, "Region options loaded", { items: [] });
  }

  const items = await listRegionOptions({
    type,
    parentId: query.parentId ? String(query.parentId) : undefined,
    limit: 1000,
  });

  return successResponse(event, "Region options loaded", { items });
});
