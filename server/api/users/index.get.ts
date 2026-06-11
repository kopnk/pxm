import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { and, eq, ilike, count, desc, sql, or, ne } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { toLocalTime } from "~/server/utils/datetime";
import {
  asJoinTable,
  createUserAuditAliases,
  mapRowAuditUsers,
  userAuditNameSelect,
} from "~/server/utils/userAuditJoin";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [
    ne(sql`lower(coalesce(${users.role}, ''))`, "superadmin"),
  ];

  if (query.role) {
    conditions.push(eq(users.role, String(query.role)));
  }

  if (query.isActive !== undefined) {
    conditions.push(eq(users.isActive, query.isActive === "true"));
  }

  if (query.search) {
    const term = `%${String(query.search).trim()}%`;
    const searchCondition = or(
      ilike(users.email, term),
      ilike(users.firstName, term),
      ilike(users.lastName, term),
      ilike(sql`concat(${users.firstName}, ' ', ${users.lastName})`, term),
      ilike(users.phone, term),
      ilike(users.region, term),
      ilike(users.area, term),
      ilike(users.role, term),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const where = and(...conditions);
  const auditUsers = createUserAuditAliases();

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
          mustChangePassword: users.mustChangePassword,
          avatarUrl: users.avatarUrl,
          lastLoginAt: users.lastLoginAt,
          createdUser: users.createdUser,
          updatedUser: users.updatedUser,
          ...userAuditNameSelect(auditUsers.creator, auditUsers.updater),
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
          mustChangePassword: users.mustChangePassword,
          lastLoginAt: users.lastLoginAt,
          createdUser: users.createdUser,
          updatedUser: users.updatedUser,
          ...userAuditNameSelect(auditUsers.creator, auditUsers.updater),
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        };

  const rows = await db
    .select(selectFields)
    .from(users)
    .leftJoin(
      asJoinTable(auditUsers.creator),
      eq(users.createdUser, auditUsers.creator.id),
    )
    .leftJoin(
      asJoinTable(auditUsers.updater),
      eq(users.updatedUser, auditUsers.updater.id),
    )
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((u) => {
    const mapped = mapRowAuditUsers(u);
    return {
      ...mapped,
      createdAt: toLocalTime(u.createdAt),
      updatedAt: toLocalTime(u.updatedAt),
      lastLoginAt: u.lastLoginAt ? toLocalTime(u.lastLoginAt) : null,
    };
  });

  return successResponse(event, "Users retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
