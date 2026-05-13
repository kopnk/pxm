import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { clients } from "~/server/db/schema/clients";

import { eq, desc, count, sql } from "drizzle-orm";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { buildProjectsListWhere } from "~/server/utils/projectsListWhere";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const search = query.search?.toString().trim();
  const status = query.status?.toString().trim();

  const where = buildProjectsListWhere({
    search: search || undefined,
    status: status || undefined,
  });

  /* ================= COUNT ================= */

  const totalResult = await db
    .select({ value: count() })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  /* ================= DATA ================= */

  /* One row per project: aggregate progress in a subquery (avoids join row multiplication). */
  const progressByProject = db
    .select({
      projectId: projectProgress.projectId,
      stageData: sql`
        COALESCE(
          json_agg(${projectProgress.stageData})
          FILTER (WHERE ${projectProgress.id} IS NOT NULL),
          '[]'::json
        )
      `.as("stageData"),
    })
    .from(projectProgress)
    .groupBy(projectProgress.projectId)
    .as("progress_by_project");

  const financialByProject = db
    .select({
      projectId: projectFinancials.projectId,
      hpp: sql`COALESCE(SUM(COALESCE(${projectFinancials.qtyPartner}, 0) * COALESCE(${projectFinancials.unitPricePartner}, 0)), 0)`.as(
        "hpp",
      ),
      dpp: sql`COALESCE(SUM(COALESCE(${projectFinancials.qtyClient}, 0) * COALESCE(${projectFinancials.unitPriceClient}, 0)), 0)`.as(
        "dpp",
      ),
    })
    .from(projectFinancials)
    .groupBy(projectFinancials.projectId)
    .as("financial_by_project");

  const rows = await db
    .select({
      id: projects.id,

      contractNumber: projects.contractNumber,
      prScNumber: projects.prScNumber,
      poNumber: projects.poNumber,

      poDate: projects.poDate,
      deliveryDate: projects.deliveryDate,
      komDate: projects.komDate,

      projectName: projects.projectName,

      subTotal: projects.subTotal,
      discount: projects.discount,
      netPrice: projects.netPrice,
      vatRate: projects.vatRate,
      vatAmount: projects.vatAmount,
      grandTotal: projects.grandTotal,

      status: projects.status,
      pm: projects.pm,

      clientId: projects.clientId,

      stageData: progressByProject.stageData,
      hpp: financialByProject.hpp,
      dpp: financialByProject.dpp,

      createdUser: projects.createdUser,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(
      progressByProject,
      eq(progressByProject.projectId, projects.id),
    )
    .leftJoin(
      financialByProject,
      eq(financialByProject.projectId, projects.id),
    )
    .where(where)
    .orderBy(desc(projects.createdAt), desc(projects.id))
    .limit(limit)
    .offset(offset);

  /* ================= FORMAT ================= */

  const items = rows.map((row) => ({

    ...row,

    subTotal: row.subTotal ? Number(row.subTotal) : 0,
    discount: row.discount ? Number(row.discount) : 0,
    netPrice: row.netPrice ? Number(row.netPrice) : 0,
    vatRate: row.vatRate ? Number(row.vatRate) : 0,
    vatAmount: row.vatAmount ? Number(row.vatAmount) : 0,
    grandTotal: row.grandTotal ? Number(row.grandTotal) : 0,
    hpp: row.hpp ? Number(row.hpp) : 0,
    dpp: row.dpp ? Number(row.dpp) : 0,
    mrg: row.dpp && Number(row.dpp) > 0
      ? ((Number(row.dpp) - Number(row.hpp || 0)) / Number(row.dpp)) * 100
      : 0,

    createdAt: toLocalTime(row.createdAt),
    updatedAt: toLocalTime(row.updatedAt),

    poDate: toLocalDate(row.poDate),
    deliveryDate: toLocalDate(row.deliveryDate),
    komDate: toLocalDate(row.komDate),

  }));

  /* ================= RESPONSE ================= */

  return successResponse(event, "Projects retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });

});
