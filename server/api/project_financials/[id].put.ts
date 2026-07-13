import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { updateProjectFinancialSchema } from "~/server/validation/project_financials.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  getProjectFinancialRecordById,
  updateProjectFinancialRecord,
} from "~/server/utils/projectFinancialStore";

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

  const oldData = await getProjectFinancialRecordById(id);
  if (!oldData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project financial not found",
    });
  }

  const updated = await updateProjectFinancialRecord(id, {
    projectId: body.projectId,
    projectDetailId: body.projectDetailId,
    projectProgressId: body.projectProgressId,
    balapId: body.balapId,
    bastId: body.bastId,
    balapNumber: body.balapNumber,
    balapDate: body.balapDate,
    flowDirection: body.flowDirection,
    status: body.status,
    docType: body.docType,
    docNumber: body.docNumber,
    docDate: body.docDate,
    vbNumber: body.vbNumber,
    vbDate: body.vbDate,
    mcmNumber: body.mcmNumber,
    mcmDate: body.mcmDate,
    paidNumber: body.paidNumber,
    paidDate: body.paidDate,
    taxIn: body.taxIn,
    taxOut: body.taxOut,
    pph: body.pph,
    note: body.note,
    stage: body.stage,
    clientId: body.clientId,
    partnerId: body.partnerId,
    bastNumber: body.bastNumber,
    bastDate: body.bastDate,
    poNumberPartner: body.poNumberPartner,
    poDatePartner: body.poDatePartner,
    invoiceNumberPartner: body.invoiceNumberPartner,
    invoiceDatePartner: body.invoiceDatePartner,
    fpNumberPartner: body.fpNumberPartner,
    fpDatePartner: body.fpDatePartner,
    qtyPartner: body.qtyPartner,
    unitPricePartner: body.unitPricePartner,
    poNumberClient: body.poNumberClient,
    poDateClient: body.poDateClient,
    invoiceNumberClient: body.invoiceNumberClient,
    invoiceDateClient: body.invoiceDateClient,
    fpNumberClient: body.fpNumberClient,
    fpDateClient: body.fpDateClient,
    qtyClient: body.qtyClient,
    unitPriceClient: body.unitPriceClient,
    updatedUser: userId,
  });
  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project financial not found",
    });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "project_financials",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(
    event,
    "Project financial updated",
    mapLocalTimestamps(updated),
  );
});
