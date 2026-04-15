import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { and, eq, ilike, desc, isNull, count } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const conditions = [isNull(projectFiles.deletedAt)];

  if (query.search) {
    conditions.push(ilike(projectFiles.fileName, `%${query.search}%`));
  }

  if (query.refTable) {
    conditions.push(eq(projectFiles.refTable, String(query.refTable)));
  }

  if (query.refId) {
    conditions.push(eq(projectFiles.refId, String(query.refId)));
  }

  if (query.fileCategory) {
    conditions.push(eq(projectFiles.fileCategory, String(query.fileCategory)));
  }

  const where = and(...conditions);

  const totalResult = await db
    .select({ value: count() })
    .from(projectFiles)
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const items = await db
    .select()
    .from(projectFiles)
    .where(where)
    .orderBy(desc(projectFiles.uploadedAt))
    .limit(limit)
    .offset(offset);

  return successResponse(event, "Files retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
