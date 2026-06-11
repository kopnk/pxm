import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { clients } from "~/server/db/schema/clients";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import {
  asJoinTable,
  createUserAuditAliases,
  mapRowAuditUsers,
  userAuditNameSelect,
} from "~/server/utils/userAuditJoin";
import { and, or, ilike, eq, count, asc, getTableColumns } from "drizzle-orm";
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
        ilike(clients.name, search),
        ilike(clients.npwp, search),
        ilike(clients.contactName, search),
        ilike(clients.contactEmail, search),
        ilike(clients.contactPhone, search),
        ilike(clients.addressText, search)
      )
    );
  }

  /* ================= FILTER ACTIVE ================= */
  if (query.isActive !== undefined) {
    conditions.push(
      eq(clients.isActive, query.isActive === "true")
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= TOTAL ================= */
  const totalResult = await db
    .select({ value: count() })
    .from(clients)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */
  const auditUsers = createUserAuditAliases();

  const rows = await db
    .select({
      ...getTableColumns(clients),
      ...userAuditNameSelect(auditUsers.creator, auditUsers.updater),
    })
    .from(clients)
    .leftJoin(
      asJoinTable(auditUsers.creator),
      eq(clients.createdUser, auditUsers.creator.id),
    )
    .leftJoin(
      asJoinTable(auditUsers.updater),
      eq(clients.updatedUser, auditUsers.updater.id),
    )
    .where(where)
    .orderBy(asc(clients.name), asc(clients.id))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => {
    const mapped = mapRowAuditUsers(row);
    return {
      ...mapped,
      createdAt: toLocalTime(row.createdAt),
      updatedAt: toLocalTime(row.updatedAt),
    };
  });

  return successResponse(event, "Clients retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});