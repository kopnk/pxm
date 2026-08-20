import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { deleteClientRecord } from "~/server/utils/clientStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const oldData = await deleteClientRecord(id);

  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "clients",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Client deleted");
});
