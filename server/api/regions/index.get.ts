import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { and, eq, ilike, count } from "drizzle-orm";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */
  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  if (query.q) {
    conditions.push(ilike(regions.name, `%${query.q}%`));
  }

  if (query.type) {
    conditions.push(eq(regions.type, String(query.type)));
  }

  if (query.parentId) {
    conditions.push(eq(regions.parentId, String(query.parentId)));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= COUNT ================= */
  const totalResult = await db
    .select({ value: count() })
    .from(regions)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */
  const rows = await db
    .select()
    .from(regions)
    .where(where)
    .orderBy(regions.name)
    .limit(limit)
    .offset(offset);

  const items = rows.map(r => ({
    ...r,
    createdAt: toLocalTime(r.createdAt),
  }));

  return successResponse(event, "Regions retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
