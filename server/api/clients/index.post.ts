import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { clients } from "~/server/db/schema/clients";
import { parseBody } from "~/server/utils/zod";
import { clientCreateSchema } from "~/server/validation/clients.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { z } from "zod";
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

  /* ================= BODY ================= */
  const rawBody = await readBody(event);

  const schema = z.union([
    clientCreateSchema,
    z.array(clientCreateSchema)
  ]);

  const parsed = parseBody(schema, rawBody);
  const payload = Array.isArray(parsed) ? parsed : [parsed];

  /* ================= TX ================= */
  const created = await db.transaction(async (tx) => {

    const rows = await tx
      .insert(clients)
      .values(
        payload.map((body) => ({
          name: body.name,
          npwp: body.npwp ?? null,
          bankName: body.bankName ?? null,
          bankAccount: body.bankAccount ?? null,
          addressText: body.addressText ?? null,
          addressMeta: body.addressMeta ?? null,
          contactName: body.contactName ?? null,
          contactPhone: body.contactPhone ?? null,
          contactEmail: body.contactEmail ?? null,
          signatoryName: body.signatoryName ?? null,
          signatoryTitle: body.signatoryTitle ?? null,
          isActive: body.isActive ?? true,

          // ✅ DATABASE TIME CENTRALIZED
          createdAt: dbTime(),
          updatedAt: dbTime(),
        }))
      )
      .returning();

    for (const row of rows) {
      await logAudit({
        actorId: userId,
        action: "CREATE",
        targetTable: "clients",
        targetId: row.id,
        newData: row,
      });
    }

    return rows;
  });

  /* ================= RESPONSE ================= */
  return successResponse(
    event,
    `Client created (${created.length} record)`,
    Array.isArray(parsed)
      ? created.map((row) => ({
          ...row,
          createdAt: toLocalTime(row.createdAt),
          updatedAt: toLocalTime(row.updatedAt),
        }))
      : {
          ...created[0],
          createdAt: toLocalTime(created[0].createdAt),
          updatedAt: toLocalTime(created[0].updatedAt),
        },
    201
  );
});