import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { parseBody } from "~/server/utils/zod";
import { createProjectFinancialSchema } from "~/server/validation/project_financials.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { numToPgString } from "~/server/utils/pgNumeric";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    createProjectFinancialSchema,
    await readBody(event),
  );

  const created = await db.transaction(async (tx) => {
    const rows = await tx.insert(projectFinancials).values({
      projectId: body.projectId,
      projectDetailId: body.projectDetailId,
      projectProgressId: body.projectProgressId ?? null,

      balapId: body.balapId ?? null,
      bastId: body.bastId ?? null,
      balapNumber: body.balapNumber ?? null,
      balapDate: body.balapDate ?? null,

      flowDirection: body.flowDirection,

      status: body.status ?? "draft",

      docType: body.docType ?? null,
      docNumber: body.docNumber ?? null,
      docDate: body.docDate ?? null,
      taxIn: numToPgString(body.taxIn),
      taxOut: numToPgString(body.taxOut),
      pph: numToPgString(body.pph),
      note: body.note ?? null,
      stage: body.stage ?? null,

      clientId: body.clientId ?? null,
      partnerId: body.partnerId ?? null,

      bastNumber: body.bastNumber ?? null,
      bastDate: body.bastDate ?? null,

      poNumberPartner: body.poNumberPartner ?? null,
      poDatePartner: body.poDatePartner ?? null,
      invoiceNumberPartner: body.invoiceNumberPartner ?? null,
      invoiceDatePartner: body.invoiceDatePartner ?? null,
      fpNumberPartner: body.fpNumberPartner ?? null,
      fpDatePartner: body.fpDatePartner ?? null,
      qtyPartner: numToPgString(body.qtyPartner),
      unitPricePartner: numToPgString(body.unitPricePartner),

      poNumberClient: body.poNumberClient ?? null,
      poDateClient: body.poDateClient ?? null,
      invoiceNumberClient: body.invoiceNumberClient ?? null,
      invoiceDateClient: body.invoiceDateClient ?? null,
      fpNumberClient: body.fpNumberClient ?? null,
      fpDateClient: body.fpDateClient ?? null,
      qtyClient: numToPgString(body.qtyClient),
      unitPriceClient: numToPgString(body.unitPriceClient),

      createdUser: userId,
      createdAt: dbTime(),
      updatedAt: dbTime(),
    }).returning();

    const createdRow = rows[0];
    if (!createdRow) {
      throw createError({
        statusCode: 500,
        statusMessage: "Insert failed",
      });
    }

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "project_financials",
      targetId: createdRow.id,
      newData: createdRow,
    });

    return createdRow;
  });

  return successResponse(event, "Project financial created", created, 201);
});
