import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { clientUpdateSchema } from "~/server/validation/clients.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { toLocalTime } from "~/server/utils/datetime";
import {
  getClientRecordById,
  updateClientRecord,
} from "~/server/utils/clientStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin"]);
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
  const body = parseBody(
    clientUpdateSchema,
    await readBody(event)
  );
  const oldData = await getClientRecordById(id);

  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  const updated = await updateClientRecord(id, {
    name: body.name ?? oldData.name,
    npwp: body.npwp ?? oldData.npwp,
    bankName: body.bankName ?? oldData.bankName,
    bankAccount: body.bankAccount ?? oldData.bankAccount,
    addressText: body.addressText ?? oldData.addressText,
    addressMeta: body.addressMeta ?? oldData.addressMeta,
    contactName: body.contactName ?? oldData.contactName,
    contactPhone: body.contactPhone ?? oldData.contactPhone,
    contactEmail:
      body.contactEmail !== undefined ? body.contactEmail : oldData.contactEmail,
    signatoryName: body.signatoryName ?? oldData.signatoryName,
    signatoryTitle: body.signatoryTitle ?? oldData.signatoryTitle,
    isActive: body.isActive ?? oldData.isActive,
    updatedUser: userId,
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "clients",
    targetId: id,
    oldData,
    newData: updated,
  });

  /* ================= RESPONSE ================= */
  return successResponse(event, "Client updated", {
    ...updated,
    createdAt: toLocalTime(updated.createdAt),
    updatedAt: toLocalTime(updated.updatedAt),
  });
});
