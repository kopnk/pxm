import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { and, eq, ilike, count, desc, sql } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  if (query.role) {
    conditions.push(eq(users.role, String(query.role)));
  }

  if (query.isActive !== undefined) {
    conditions.push(eq(users.isActive, query.isActive === "true"));
  }

  if (query.search) {
    conditions.push(
      ilike(
        sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        `%${query.search}%`
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalResult = await db
    .select({ value: count() })
    .from(users)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const selectFields =
    actor.role === "superadmin"
      ? {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          region: users.region,
          area: users.area,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      : {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        };

  const rows = await db
    .select(selectFields)
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((u) => ({
    ...u,
    createdAt: toLocalTime(u.createdAt),
    updatedAt: toLocalTime(u.updatedAt),
    lastLoginAt: u.lastLoginAt ? toLocalTime(u.lastLoginAt) : null,
  }));

  return successResponse(event, "Users retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
