import { defineEventHandler, readBody, createError } from "h3";
import { getClientRecordById } from "~/server/utils/clientStore";
import { mapLocalTimestamps, toLocalDate } from "~/server/utils/datetime";
import {
  calculateProjectAmounts,
  createProjectRecord,
} from "~/server/utils/projectStore";
import { parseBody } from "~/server/utils/zod";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { createProjectSchema } from "~/server/validation/projects.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(createProjectSchema, await readBody(event));
  const poDate = toLocalDate(body.poDate);
  if (!poDate) {
    throw createError({ statusCode: 400, statusMessage: "Invalid PO date" });
  }

  if (body.clientId) {
    const client = await getClientRecordById(body.clientId);
    if (!client) {
      throw createError({ statusCode: 400, statusMessage: "Client not found" });
    }
  }

  const amounts = calculateProjectAmounts(body);
  const created = await createProjectRecord({
    contractNumber: body.contractNumber ?? null,
    prScNumber: body.prScNumber,
    poNumber: body.poNumber,
    poDate,
    deliveryDate: toLocalDate(body.deliveryDate),
    komDate: toLocalDate(body.komDate),
    projectName: body.projectName,
    subTotal: amounts.subTotal,
    discount: amounts.discount,
    vatRate: amounts.vatRate,
    status: body.status ?? "active",
    pm: body.pm ?? null,
    clientId: body.clientId ?? null,
    createdUser: userId,
    updatedUser: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "projects",
    targetId: created.id,
    newData: created,
  });

  return successResponse(
    event,
    "Project created",
    {
      ...mapLocalTimestamps(created),
    },
    201,
  );
});
