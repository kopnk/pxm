import { defineEventHandler, getQuery } from "h3";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";

const ALLOWED_TYPES = ["region", "sub_region"] as const;

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const type = String(query.type ?? "region");

  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return successResponse(event, "Region options loaded", { items: [] });
  }

  const conditions = [eq(regions.type, type)];

  if (query.parentId) {
    conditions.push(eq(regions.parentId, String(query.parentId)));
  }

  const items = await db
    .select({
      id: regions.id,
      name: regions.name,
      type: regions.type,
    })
    .from(regions)
    .where(and(...conditions))
    .orderBy(regions.name)
    .limit(1000);

  return successResponse(event, "Region options loaded", { items });
});
