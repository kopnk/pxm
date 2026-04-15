import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { clients } from "~/server/db/schema/clients";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { clientUpdateSchema } from "~/server/validation/clients.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { toLocalTime } from "~/server/utils/datetime";
import { dbTime } from "~/server/utils/dbTime";

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

  /* ================= TX ================= */
  const updated = await db.transaction(async (tx) => {

    const oldRows = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "Client not found" });
    }

    /* ================= UPDATE ================= */
    const rows = await tx
      .update(clients)
      .set({
        name: body.name ?? oldData.name,
        npwp: body.npwp ?? oldData.npwp,
        bankName: body.bankName ?? oldData.bankName,
        bankAccount: body.bankAccount ?? oldData.bankAccount,
        addressText: body.addressText ?? oldData.addressText,
        addressMeta: body.addressMeta ?? oldData.addressMeta,
        contactName: body.contactName ?? oldData.contactName,
        contactPhone: body.contactPhone ?? oldData.contactPhone,
        contactEmail: body.contactEmail ?? oldData.contactEmail,
        signatoryName: body.signatoryName ?? oldData.signatoryName,
        signatoryTitle: body.signatoryTitle ?? oldData.signatoryTitle,
        isActive: body.isActive ?? oldData.isActive,

        // ✅ DATABASE TIME CENTRALIZED
        updatedAt: dbTime(),
      })
      .where(eq(clients.id, id))
      .returning();

    const row = rows[0];

    /* ================= AUDIT ================= */
    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "clients",
      targetId: id,
      oldData,
      newData: row,
    });

    return row;
  });

  /* ================= RESPONSE ================= */
  return successResponse(event, "Client updated", {
    ...updated,
    createdAt: toLocalTime(updated.createdAt),
    updatedAt: toLocalTime(updated.updatedAt),
  });
});