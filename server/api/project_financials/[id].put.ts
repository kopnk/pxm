import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { updateProjectFinancialSchema } from "~/server/validation/project_financials.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { mergePgNumeric } from "~/server/utils/pgNumeric";

function pickStr(
  bodyVal: string | null | undefined,
  previous: string | null,
): string | null {
  if (bodyVal === undefined) return previous;
  return bodyVal ?? null;
}

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const body = parseBody(updateProjectFinancialSchema, await readBody(event));

  const updated = await db.transaction(async (tx) => {
    const oldRows = await tx
      .select()
      .from(projectFinancials)
      .where(eq(projectFinancials.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project financial not found",
      });
    }

    const rows = await tx
      .update(projectFinancials)
      .set({
        projectId: body.projectId ?? oldData.projectId,
        projectDetailId: body.projectDetailId ?? oldData.projectDetailId,
        projectProgressId:
          body.projectProgressId === undefined
            ? oldData.projectProgressId
            : body.projectProgressId ?? null,

        balapId:
          body.balapId === undefined ? oldData.balapId : body.balapId ?? null,
        bastId:
          body.bastId === undefined ? oldData.bastId : body.bastId ?? null,
        balapNumber: pickStr(body.balapNumber, oldData.balapNumber),
        balapDate: pickStr(body.balapDate, oldData.balapDate),

        flowDirection: body.flowDirection ?? oldData.flowDirection,

        status: body.status ?? oldData.status,

        docType: pickStr(body.docType, oldData.docType),
        docNumber: pickStr(body.docNumber, oldData.docNumber),
        docDate: pickStr(body.docDate, oldData.docDate),

        taxIn: mergePgNumeric(body.taxIn, oldData.taxIn),
        taxOut: mergePgNumeric(body.taxOut, oldData.taxOut),
        pph: mergePgNumeric(body.pph, oldData.pph),

        note: pickStr(body.note, oldData.note),
        stage:
          body.stage === undefined ? oldData.stage : body.stage ?? null,

        clientId:
          body.clientId === undefined ? oldData.clientId : body.clientId ?? null,
        partnerId:
          body.partnerId === undefined
            ? oldData.partnerId
            : body.partnerId ?? null,

        bastNumber: pickStr(body.bastNumber, oldData.bastNumber),
        bastDate: pickStr(body.bastDate, oldData.bastDate),

        poNumberPartner: pickStr(body.poNumberPartner, oldData.poNumberPartner),
        poDatePartner: pickStr(body.poDatePartner, oldData.poDatePartner),
        invoiceNumberPartner: pickStr(
          body.invoiceNumberPartner,
          oldData.invoiceNumberPartner,
        ),
        invoiceDatePartner: pickStr(
          body.invoiceDatePartner,
          oldData.invoiceDatePartner,
        ),
        fpNumberPartner: pickStr(body.fpNumberPartner, oldData.fpNumberPartner),
        fpDatePartner: pickStr(body.fpDatePartner, oldData.fpDatePartner),
        qtyPartner: mergePgNumeric(body.qtyPartner, oldData.qtyPartner),
        unitPricePartner: mergePgNumeric(
          body.unitPricePartner,
          oldData.unitPricePartner,
        ),

        poNumberClient: pickStr(body.poNumberClient, oldData.poNumberClient),
        poDateClient: pickStr(body.poDateClient, oldData.poDateClient),
        invoiceNumberClient: pickStr(
          body.invoiceNumberClient,
          oldData.invoiceNumberClient,
        ),
        invoiceDateClient: pickStr(
          body.invoiceDateClient,
          oldData.invoiceDateClient,
        ),
        fpNumberClient: pickStr(body.fpNumberClient, oldData.fpNumberClient),
        fpDateClient: pickStr(body.fpDateClient, oldData.fpDateClient),
        qtyClient: mergePgNumeric(body.qtyClient, oldData.qtyClient),
        unitPriceClient: mergePgNumeric(
          body.unitPriceClient,
          oldData.unitPriceClient,
        ),

        updatedAt: dbTime(),
      })
      .where(eq(projectFinancials.id, id))
      .returning();

    const updatedRow = rows[0];

    if (!updatedRow) {
      throw createError({
        statusCode: 500,
        statusMessage: "Update failed",
      });
    }

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "project_financials",
      targetId: id,
      oldData,
      newData: updatedRow,
    });

    return updatedRow;
  });

  return successResponse(event, "Project financial updated", updated);
});
