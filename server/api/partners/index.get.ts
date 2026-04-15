import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { and, or, ilike, eq, count, asc } from "drizzle-orm";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  /* ================= GLOBAL SEARCH ================= */
  if (query.search) {
    const search = `%${query.search}%`;

    conditions.push(
      or(
        ilike(partners.name, search),
        ilike(partners.npwp, search),
        ilike(partners.partnerType, search),
        ilike(partners.contactName, search),
        ilike(partners.contactEmail, search),
        ilike(partners.contactPhone, search),
        ilike(partners.addressText, search)
      )
    );
  }

  /* ================= FILTER ACTIVE ================= */
  if (query.isActive !== undefined) {
    conditions.push(
      eq(partners.isActive, query.isActive === "true")
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= TOTAL ================= */
  const totalResult = await db
    .select({ value: count() })
    .from(partners)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */
  const rows = await db
    .select()
    .from(partners)
    .where(where)
    .orderBy(asc(partners.name), asc(partners.id))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row,
    rating: row.rating ? Number(row.rating) : null,
    createdAt: toLocalTime(row.createdAt),
    updatedAt: toLocalTime(row.updatedAt),
  }));

  return successResponse(event, "Partners retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});