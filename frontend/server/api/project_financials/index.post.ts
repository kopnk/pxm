import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { createProjectFinancialSchema } from "~/server/validation/project_financials.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { createProjectFinancialRecord } from "~/server/utils/projectFinancialStore";

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

  const created = await createProjectFinancialRecord({
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
    vbNumber: body.vbNumber ?? null,
    vbDate: body.vbDate ?? null,
    mcmNumber: body.mcmNumber ?? null,
    mcmDate: body.mcmDate ?? null,
    paidNumber: body.paidNumber ?? null,
    paidDate: body.paidDate ?? null,
    taxIn: body.taxIn ?? null,
    taxOut: body.taxOut ?? null,
    pph: body.pph ?? null,
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
    qtyPartner: body.qtyPartner ?? null,
    unitPricePartner: body.unitPricePartner ?? null,
    poNumberClient: body.poNumberClient ?? null,
    poDateClient: body.poDateClient ?? null,
    invoiceNumberClient: body.invoiceNumberClient ?? null,
    invoiceDateClient: body.invoiceDateClient ?? null,
    fpNumberClient: body.fpNumberClient ?? null,
    fpDateClient: body.fpDateClient ?? null,
    qtyClient: body.qtyClient ?? null,
    unitPriceClient: body.unitPriceClient ?? null,
    createdUser: userId,
    updatedUser: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "project_financials",
    targetId: created.id,
    newData: created,
  });

  return successResponse(
    event,
    "Project financial created",
    mapLocalTimestamps(created),
    201,
  );
});
