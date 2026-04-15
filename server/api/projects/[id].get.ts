import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { eq, sql } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= PARAM ================= */
  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const financialRows = await db
    .select({
      hpp: sql`COALESCE(SUM(COALESCE(${projectFinancials.qtyPartner}, 0) * COALESCE(${projectFinancials.unitPricePartner}, 0)), 0)`,
      dpp: sql`COALESCE(SUM(COALESCE(${projectFinancials.qtyClient}, 0) * COALESCE(${projectFinancials.unitPriceClient}, 0)), 0)`,
    })
    .from(projectFinancials)
    .where(eq(projectFinancials.projectId, id))
    .limit(1);

  /* ================= QUERY ================= */
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
      createdUser: projects.createdUser,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

const data = {
  ...row,

  subTotal: row.subTotal ? Number(row.subTotal) : 0,
  discount: row.discount ? Number(row.discount) : 0,
  netPrice: row.netPrice ? Number(row.netPrice) : 0,
  vatRate: row.vatRate ? Number(row.vatRate) : 0,
  vatAmount: row.vatAmount ? Number(row.vatAmount) : 0,
  grandTotal: row.grandTotal ? Number(row.grandTotal) : 0,
  hpp: financialRows[0]?.hpp ? Number(financialRows[0].hpp) : 0,
  dpp: financialRows[0]?.dpp ? Number(financialRows[0].dpp) : 0,
  mrg:
    financialRows[0]?.dpp && Number(financialRows[0].dpp) > 0
      ? ((Number(financialRows[0].dpp) - Number(financialRows[0].hpp || 0)) /
          Number(financialRows[0].dpp)) *
        100
      : 0,

  createdAt: toLocalTime(row.createdAt),
  updatedAt: toLocalTime(row.updatedAt),

  poDate: toLocalDate(row.poDate),
  deliveryDate: toLocalDate(row.deliveryDate),
  komDate: toLocalDate(row.komDate),
};

  return successResponse(event, "Project retrieved", data);
});
