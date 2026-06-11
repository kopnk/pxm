import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { and, eq, ilike, count, asc } from "drizzle-orm";
import { mapLocalTimestamps } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  if (query.search) {
    conditions.push(ilike(progressStage.name, `%${query.search}%`));
  }

  if (query.stageType) {
    const stageType = String(query.stageType);
    if (
      stageType === "admin" ||
      stageType === "field" ||
      stageType === "document"
    ) {
      conditions.push(eq(progressStage.stageType, stageType));
    }
  }

  if (query.isActive !== undefined) {
    conditions.push(
      eq(progressStage.isActive, query.isActive === "true")
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalResult = await db
    .select({ value: count() })
    .from(progressStage)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const items = await db
    .select()
    .from(progressStage)
    .where(where)
    .orderBy(asc(progressStage.sequence))
    .limit(limit)
    .offset(offset);

  return successResponse(event, "Progress stages retrieved", {
    items: items.map((row) => mapLocalTimestamps(row)),
    page,
    limit,
    total,
    totalPages,
  });
});
