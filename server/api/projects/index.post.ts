import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { parseBody } from "~/server/utils/zod";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { createProjectSchema } from "~/server/validation/projects.schema";
import { toLocalDate, toLocalTime } from "~/server/utils/datetime";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  /* ================= BODY ================= */
  const body = parseBody(createProjectSchema, await readBody(event));

  /* ================= BUSINESS CALC ================= */
  const subTotal = Number(body.subTotal ?? 0);
  const discount = Number(body.discount ?? 0);
  const vatRate = Number(body.vatRate ?? 11);

  const netPrice = subTotal - discount;
  const vatAmount = (netPrice * vatRate) / 100;
  const grandTotal = netPrice + vatAmount;

  /* ================= INSERT ================= */
  const created = await db.transaction(async (tx) => {

    const rows = await tx
      .insert(projects)
      .values({
        contractNumber: body.contractNumber ?? null,
        prScNumber: body.prScNumber,
        poNumber: body.poNumber,

        poDate: toLocalDate(body.poDate),
        deliveryDate: toLocalDate(body.deliveryDate),
        komDate: toLocalDate(body.komDate),

        projectName: body.projectName,

        subTotal: subTotal.toString(),
        discount: discount.toString(),
        netPrice: netPrice.toString(),

        vatRate: vatRate.toString(),
        vatAmount: vatAmount.toString(),
        grandTotal: grandTotal.toString(),

        status: body.status ?? "active",
        pm: body.pm ?? null,

        clientId: body.clientId ?? null,

        createdUser: userId,

        // ✅ AUTHORITATIVE DB TIME
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning();

    const createdRow = rows[0];

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "projects",
      targetId: createdRow.id,
      newData: createdRow,
    });

    return createdRow;
  });

  /* ================= RESPONSE ================= */
  return successResponse(event, "Project created", {
    ...created,
    createdAt: toLocalTime(created.createdAt),
    updatedAt: toLocalTime(created.updatedAt),
    subTotal: Number(created.subTotal),
    discount: Number(created.discount),
    netPrice: Number(created.netPrice),
    vatRate: Number(created.vatRate),
    vatAmount: Number(created.vatAmount),
    grandTotal: Number(created.grandTotal),
  }, 201);
});
