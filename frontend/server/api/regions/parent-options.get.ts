import { defineEventHandler, getQuery } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { regionTypeEnum } from "~/server/validation/regions.schema";
import { listRegionOptions } from "~/server/utils/regionStore";

const PARENT_TYPES = ["region", "sub_region"] as const;

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const rawType = String(getQuery(event).type ?? "").trim();
  const parsed = regionTypeEnum.safeParse(rawType);

  if (
    !parsed.success ||
    !PARENT_TYPES.includes(parsed.data as (typeof PARENT_TYPES)[number])
  ) {
    return successResponse(event, "Parent options loaded", { items: [] });
  }

  const items = await listRegionOptions({
    type: parsed.data,
    limit: 1000,
  });

  return successResponse(event, "Parent options loaded", { items });
});
