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

const MAX_EXPORT_ROWS = 8000;

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  const x = Array.isArray(v) ? v[0] : v;
  const t = String(x).trim();
  return t === "" ? undefined : t;
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const raw = getQuery(event);
  const parsed = projectsExportQueryZ.safeParse({
    search: firstQuery(raw.search),
    status: firstQuery(raw.status),
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
  if (total > MAX_EXPORT_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many rows (${total}). Narrow search or filters (max ${MAX_EXPORT_ROWS}).`,
    });
  }

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
    .orderBy(desc(projects.createdAt), desc(projects.id));

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
    suggestedFileName: `projects-${dateLabel}.xlsx`,
  });
});
