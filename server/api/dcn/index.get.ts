import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { dcn } from "~/server/db/schema/dcn";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import {
  asJoinTable,
  createUserAuditAliases,
  mapRowAuditUsers,
  userAuditNameSelect,
} from "~/server/utils/userAuditJoin";
import { and, or, ilike, eq, count, desc, gte, lte } from "drizzle-orm";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [];

  if (query.search) {
    const search = `%${String(query.search)}%`;
    conditions.push(
      or(
        ilike(dcn.number, search),
        ilike(dcn.type, search),
        ilike(dcn.toAddress, search),
        ilike(dcn.fromAddress, search),
        ilike(dcn.subject, search),
      ),
    );
  }

  if (query.flow === "in" || query.flow === "out") {
    conditions.push(eq(dcn.flow, query.flow));
  }

  if (typeof query.type === "string" && query.type.trim() !== "") {
    conditions.push(eq(dcn.type, query.type.trim()));
  }

  if (typeof query.year === "string" && /^\d{4}$/.test(query.year)) {
    const year = Number(query.year);
    conditions.push(gte(dcn.letterDate, `${year}-01-01`));
    conditions.push(lte(dcn.letterDate, `${year}-12-31`));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalResult = await db
    .select({ value: count() })
    .from(dcn)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const auditUsers = createUserAuditAliases();

  const rows = await db
    .select({
      id: dcn.id,
      flow: dcn.flow,
      type: dcn.type,
      number: dcn.number,
      letterDate: dcn.letterDate,
      toAddress: dcn.toAddress,
      fromAddress: dcn.fromAddress,
      subject: dcn.subject,
      createdUser: dcn.createdUser,
      ...userAuditNameSelect(auditUsers.creator, auditUsers.updater),
      createdAt: dcn.createdAt,
      updatedAt: dcn.updatedAt,
    })
    .from(dcn)
    .leftJoin(
      asJoinTable(auditUsers.creator),
      eq(dcn.createdUser, auditUsers.creator.id),
    )
    .leftJoin(
      asJoinTable(auditUsers.updater),
      eq(dcn.updatedUser, auditUsers.updater.id),
    )
    .where(where)
    .orderBy(desc(dcn.createdAt), desc(dcn.id))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => {
    const mapped = mapRowAuditUsers(row);
    return {
      ...mapped,
      letterDate: toLocalDate(row.letterDate as unknown as string),
      createdAt: toLocalTime(row.createdAt),
      updatedAt: toLocalTime(row.updatedAt),
    };
  });

  return successResponse(event, "DCN records retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
