import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { updatePartnerSchema } from "~/server/validation/partners.schema";
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
    updatePartnerSchema,
    await readBody(event)
  );

  /* ================= TX ================= */
  const updated = await db.transaction(async (tx) => {

    const oldRows = await tx
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "Partner not found" });
    }

    const rating = body.rating ?? oldData.rating;

    const rows = await tx
      .update(partners)
      .set({
        name: body.name ?? oldData.name,
        npwp: body.npwp ?? oldData.npwp,
        bankName: body.bankName ?? oldData.bankName,
        bankAccount: body.bankAccount ?? oldData.bankAccount,
        partnerType: body.partnerType ?? oldData.partnerType,
        addressText: body.addressText ?? oldData.addressText,
        addressMeta: body.addressMeta ?? oldData.addressMeta,
        contactName: body.contactName ?? oldData.contactName,
        contactPhone: body.contactPhone ?? oldData.contactPhone,
        contactEmail: body.contactEmail ?? oldData.contactEmail,
        signatoryName: body.signatoryName ?? oldData.signatoryName,
        signatoryTitle: body.signatoryTitle ?? oldData.signatoryTitle,
        rating: rating !== null ? rating.toString() : null,
        isActive: body.isActive ?? oldData.isActive,

        // ✅ DATABASE AUTHORITATIVE TIME
        updatedAt: dbTime(),
      })
      .where(eq(partners.id, id))
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "partners",
      targetId: id,
      oldData,
      newData: row,
    });

    return row;
  });

  /* ================= RESPONSE ================= */
  return successResponse(event, "Partner updated", {
    ...updated,
    rating: updated.rating ? Number(updated.rating) : null,
    createdAt: toLocalTime(updated.createdAt),
    updatedAt: toLocalTime(updated.updatedAt),
  });
});