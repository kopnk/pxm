import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import {
  asJoinTable,
  createUserAuditAliases,
  mapRowAuditUsers,
  userAuditNameSelect,
} from "~/server/utils/userAuditJoin";
import { and, eq, ilike, count, asc, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  const searchText = String(query.search ?? query.q ?? "").trim();
  if (searchText) {
    conditions.push(ilike(regions.name, `%${searchText}%`));
  }

  if (query.type) {
    conditions.push(eq(regions.type, String(query.type)));
  }

  if (query.parentId) {
    conditions.push(eq(regions.parentId, String(query.parentId)));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalResult = await db
    .select({ value: count() })
    .from(regions)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const parent = alias(regions, "parent");
  const auditUsers = createUserAuditAliases();

  const rows = await db
    .select({
      ...getTableColumns(regions),
      parentName: parent.name,
      ...userAuditNameSelect(auditUsers.creator, auditUsers.updater),
    })
    .from(regions)
    .leftJoin(asJoinTable(parent), eq(regions.parentId, parent.id))
    .leftJoin(
      asJoinTable(auditUsers.creator),
      eq(regions.createdUser, auditUsers.creator.id),
    )
    .leftJoin(
      asJoinTable(auditUsers.updater),
      eq(regions.updatedUser, auditUsers.updater.id),
    )
    .where(where)
    .orderBy(asc(regions.type), asc(regions.name), asc(regions.id))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => {
    const mapped = mapRowAuditUsers(row);
    return {
      ...mapped,
      parentName: row.parentName ?? null,
      createdAt: toLocalTime(row.createdAt),
      updatedAt: toLocalTime(row.updatedAt),
    };
  });

  return successResponse(event, "Regions retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
