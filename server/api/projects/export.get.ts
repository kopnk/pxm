import { defineEventHandler, getQuery, createError } from "h3";
import { count, desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { clients } from "~/server/db/schema/clients";
import { requireRole } from "~/server/utils/authorize";
import { buildProjectsListWhere } from "~/server/utils/projectsListWhere";
import {
  buildProjectsExportAoa,
  type ProjectListExportRow,
} from "~/server/utils/buildProjectsExportAoa";
import { projectsExportQueryZ } from "~/server/validation/projects.schema";
import { toLocalDate } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { buildTotalPages } from "~/server/utils/pagination";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { firstQuery } from "~/server/utils/firstQuery";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
    page: firstQuery(raw.page),
    limit: firstQuery(raw.limit),
  });

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
    });
  }

  const q = parsed.data;
  const where = buildProjectsListWhere({
    search: q.search,
    status: q.status,
  });

  const countRow = await db
    .select({ value: count() })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(where);

  const total = Number(countRow[0]?.value ?? 0);
  const page = q.page ?? 1;
  const limit = q.limit ?? DEFAULT_PAGE_LIMIT;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      projectName: projects.projectName,
      contractNumber: projects.contractNumber,
      prScNumber: projects.prScNumber,
      poNumber: projects.poNumber,
      poDate: projects.poDate,
      deliveryDate: projects.deliveryDate,
      komDate: projects.komDate,
      pm: projects.pm,
      clientName: clients.name,
      subTotal: projects.subTotal,
      discount: projects.discount,
      netPrice: projects.netPrice,
      vatAmount: projects.vatAmount,
      grandTotal: projects.grandTotal,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(where)
    .orderBy(desc(projects.createdAt), desc(projects.id))
    .limit(limit)
    .offset(offset);

  const exportRows: ProjectListExportRow[] = rows.map((row) => ({
    projectName: row.projectName,
    contractNumber: row.contractNumber,
    prScNumber: row.prScNumber,
    poNumber: row.poNumber,
    poDate: toLocalDate(row.poDate ?? null),
    deliveryDate: toLocalDate(row.deliveryDate ?? null),
    komDate: toLocalDate(row.komDate ?? null),
    pm: row.pm,
    clientName: row.clientName,
    subTotal: row.subTotal,
    discount: row.discount,
    netPrice: row.netPrice,
    vatAmount: row.vatAmount,
    grandTotal: row.grandTotal,
  }));

  const matrix = buildProjectsExportAoa(exportRows);
  const dateLabel = toLocalDate(new Date()) ?? "export";

  return successResponse(event, "Projects export matrix ready", {
    matrix,
    suggestedFileName: `projects-p${page}-${dateLabel}.xlsx`,
    meta: {
      page,
      limit,
      total,
      totalPages: buildTotalPages(total, limit),
      exportedLines: exportRows.length,
    },
  });
});
