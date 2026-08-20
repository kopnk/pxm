import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { createPartnerSchema } from "~/server/validation/partners.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { z } from "zod";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { createPartnerRecord } from "~/server/utils/partnerStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  /* ================= BODY ================= */
  const rawBody = await readBody(event);

  const parsed = Array.isArray(rawBody)
    ? parseBody(z.array(createPartnerSchema), rawBody)
    : parseBody(createPartnerSchema, rawBody);
  const payload = Array.isArray(parsed) ? parsed : [parsed];

  /* ================= TX ================= */
  const created = await Promise.all(
    payload.map(async (body) => {
      const row = await createPartnerRecord({
        name: body.name,
        npwp: body.npwp ?? null,
        bankName: body.bankName ?? null,
        bankAccount: body.bankAccount ?? null,
        partnerType: body.partnerType ?? null,
        addressText: body.addressText ?? null,
        addressMeta: body.addressMeta ?? null,
        contactName: body.contactName ?? null,
        contactPhone: body.contactPhone ?? null,
        contactEmail: body.contactEmail ?? null,
        signatoryName: body.signatoryName ?? null,
        signatoryTitle: body.signatoryTitle ?? null,
        rating: body.rating ?? null,
        isActive: body.isActive ?? true,
        createdUser: userId,
        updatedUser: userId,
      });

      await logAudit({
        event,
        actorId: userId,
        action: "CREATE",
        targetTable: "partners",
        targetId: row.id,
        newData: row,
      });

      return row;
      /*

    const rows = await tx
      .insert(partners)
      .values(
        payload.map((body) => ({
          name: body.name,
          npwp: body.npwp ?? null,
          bankName: body.bankName ?? null,
          bankAccount: body.bankAccount ?? null,
          partnerType: body.partnerType ?? null,
          addressText: body.addressText ?? null,
          addressMeta: body.addressMeta ?? null,
          contactName: body.contactName ?? null,
          contactPhone: body.contactPhone ?? null,
          contactEmail: body.contactEmail ?? null,
          signatoryName: body.signatoryName ?? null,
          signatoryTitle: body.signatoryTitle ?? null,
          rating: body.rating !== undefined ? Number(body.rating).toString() : null,
          isActive: body.isActive ?? true,
          createdUser: userId,

          // ✅ DATABASE TIME (CONSISTENT POLICY)
          createdAt: dbTime(),
          updatedAt: dbTime(),
        }))
      )
      .returning();

    for (const row of rows) {
      await logAudit({
        event,
        actorId: userId,
        action: "CREATE",
        targetTable: "partners",
        targetId: row.id,
        newData: row,
      });
    }

    return rows;
    */
    }),
  );

  /* ================= RESPONSE ================= */
  const responseData = created.map((row) => ({
    ...mapLocalTimestamps(row),
    rating: row.rating ?? null,
  }));

  return successResponse(
    event,
    `Partner created (${responseData.length} record)`,
    Array.isArray(parsed) ? responseData : responseData[0],
    201
  );
});
