import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { updateProjectSchema } from "~/server/validation/projects.schema";
import { dbTime } from "~/server/utils/dbTime";
import { toLocalDate } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  /* ================= PARAM ================= */
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  /* ================= BODY ================= */
  const body = parseBody(updateProjectSchema, await readBody(event));

  /* ================= OLD DATA ================= */
  const oldRows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  const oldData = oldRows[0];

  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

  /* ================= BUSINESS CALC ================= */
  const subTotal = Number(body.subTotal ?? oldData.subTotal ?? 0);
  const discount = Number(body.discount ?? oldData.discount ?? 0);
  const vatRate = Number(body.vatRate ?? oldData.vatRate ?? 11);

  const netPrice = subTotal - discount;
  const vatAmount = (netPrice * vatRate) / 100;
  const grandTotal = netPrice + vatAmount;

  /* ================= UPDATE ================= */
  const updatedRows = await db
    .update(projects)
    .set({
      contractNumber: body.contractNumber ?? oldData.contractNumber,
      prScNumber: body.prScNumber ?? oldData.prScNumber,
      poNumber: body.poNumber ?? oldData.poNumber,

      poDate: body.poDate !== undefined
        ? toLocalDate(body.poDate)
        : oldData.poDate,

      deliveryDate: body.deliveryDate !== undefined
        ? toLocalDate(body.deliveryDate)
        : oldData.deliveryDate,

      komDate: body.komDate !== undefined
        ? toLocalDate(body.komDate)
        : oldData.komDate,

      projectName: body.projectName ?? oldData.projectName,

      subTotal: subTotal.toString(),
      discount: discount.toString(),
      netPrice: netPrice.toString(),

      vatRate: vatRate.toString(),
      vatAmount: vatAmount.toString(),
      grandTotal: grandTotal.toString(),

      status: body.status ?? oldData.status,
      pm: body.pm !== undefined ? body.pm : oldData.pm,

      clientId:
        body.clientId !== undefined ? body.clientId : oldData.clientId,

      // ✅ AUTHORITATIVE DATABASE TIME
      updatedAt: dbTime(),
    })
    .where(eq(projects.id, id))
    .returning();

  const updated = updatedRows[0];

  /* ================= AUDIT ================= */
  await logAudit({
    actorId: userId,
    action: "UPDATE",
    targetTable: "projects",
    targetId: id,
    oldData,
    newData: updated,
  });

  /* ================= RESPONSE ================= */
  return successResponse(event, "Project updated", {
    ...updated,
    subTotal: Number(updated.subTotal),
    discount: Number(updated.discount),
    netPrice: Number(updated.netPrice),
    vatRate: Number(updated.vatRate),
    vatAmount: Number(updated.vatAmount),
    grandTotal: Number(updated.grandTotal),
  });
});
