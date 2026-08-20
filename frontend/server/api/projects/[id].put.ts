import { defineEventHandler, readBody, createError } from "h3";
import { getClientRecordById } from "~/server/utils/clientStore";
import { mapLocalTimestamps, toLocalDate } from "~/server/utils/datetime";
import {
  calculateProjectAmounts,
  getProjectRecordById,
  updateProjectRecord,
} from "~/server/utils/projectStore";
import { parseBody } from "~/server/utils/zod";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { updateProjectSchema } from "~/server/validation/projects.schema";

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

  const body = parseBody(updateProjectSchema, await readBody(event));
  const oldData = await getProjectRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

  if (body.clientId) {
    const client = await getClientRecordById(body.clientId);
    if (!client) {
      throw createError({ statusCode: 400, statusMessage: "Client not found" });
    }
  }

  const amounts = calculateProjectAmounts({
    subTotal: body.subTotal ?? oldData.subTotal,
    discount: body.discount ?? oldData.discount,
    vatRate: body.vatRate ?? oldData.vatRate,
  });

  const updated = await updateProjectRecord(id, {
    contractNumber: body.contractNumber ?? oldData.contractNumber,
    prScNumber: body.prScNumber ?? oldData.prScNumber,
    poNumber: body.poNumber ?? oldData.poNumber,
    poDate:
      body.poDate !== undefined
        ? (toLocalDate(body.poDate) ?? oldData.poDate)
        : oldData.poDate,
    deliveryDate:
      body.deliveryDate !== undefined
        ? toLocalDate(body.deliveryDate)
        : oldData.deliveryDate,
    komDate:
      body.komDate !== undefined
        ? toLocalDate(body.komDate)
        : oldData.komDate,
    projectName: body.projectName ?? oldData.projectName,
    subTotal: amounts.subTotal,
    discount: amounts.discount,
    vatRate: amounts.vatRate,
    status: body.status ?? oldData.status,
    pm: body.pm !== undefined ? body.pm : oldData.pm,
    clientId: body.clientId !== undefined ? body.clientId : oldData.clientId,
    updatedUser: userId,
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "projects",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(event, "Project updated", {
    ...mapLocalTimestamps(updated),
  });
});
