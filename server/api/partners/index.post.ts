import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { parseBody } from "~/server/utils/zod";
import { createPartnerSchema } from "~/server/validation/partners.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { z } from "zod";
import { dbTime } from "~/server/utils/dbTime";

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

  const schema = z.union([
    createPartnerSchema,
    z.array(createPartnerSchema)
  ]);

  const parsed = parseBody(schema, rawBody);
  const payload = Array.isArray(parsed) ? parsed : [parsed];

  /* ================= TX ================= */
  const created = await db.transaction(async (tx) => {

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

          // ✅ DATABASE TIME (CONSISTENT POLICY)
          createdAt: dbTime(),
          updatedAt: dbTime(),
        }))
      )
      .returning();

    for (const row of rows) {
      await logAudit({
        actorId: userId,
        action: "CREATE",
        targetTable: "partners",
        targetId: row.id,
        newData: row,
      });
    }

    return rows;
  });

  /* ================= RESPONSE ================= */
  const responseData = created.map((row) => ({
    ...row,
    rating: row.rating ? Number(row.rating) : null,
  }));

  return successResponse(
    event,
    `Partner created (${responseData.length} record)`,
    Array.isArray(parsed) ? responseData : responseData[0],
    201
  );
});