import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const authRole = event.context.user.role;
  const query = getQuery(event);

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const offset = (page - 1) * limit;

  const filters = [];

  if (query.role) {
    filters.push(eq(users.role, String(query.role)));
  }

  if (query.isActive !== undefined) {
    filters.push(eq(users.isActive, query.isActive === "true"));
  }

  if (query.search) {
    filters.push(
      ilike(
        sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        `%${query.search}%`
      )
    );
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  // 🔥 FIELD SELECTION BERDASARKAN ROLE
  const selectFields =
    authRole === "superadmin"
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

  const items = await db
    .select(selectFields)
    .from(users)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(whereClause);

  const total = Number(totalResult[0].count);

  return successResponse(event, "Users retrieved", {
    items: items.map((u) => ({
      ...u,
      createdAt: toLocalTime(u.createdAt),
      updatedAt: toLocalTime(u.updatedAt),
      lastLoginAt: u.lastLoginAt
        ? toLocalTime(u.lastLoginAt)
        : null,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

