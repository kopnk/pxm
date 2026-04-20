import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { dcn } from "~/server/db/schema/dcn";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { dcnUpdateSchema } from "~/server/validation/dcn.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { dbTime } from "~/server/utils/dbTime";
import {
  formatDcnOutNumber,
  getNextDcnOutNumber,
  parseDcnOutNumber,
} from "~/server/utils/dcnNumber";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const body = parseBody(dcnUpdateSchema, await readBody(event));

  const updated = await db.transaction(async (tx) => {
    const oldRows = await tx
      .select()
      .from(dcn)
      .where(eq(dcn.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "DCN record not found" });
    }

    const nextLetterDate = body.letterDate ?? oldData.letterDate;
    const nextFlow = body.flow ?? oldData.flow;
    const nextType = body.type !== undefined ? body.type : oldData.type;
    const incomingNumber = body.number?.trim();

    const oldYear = Number(String(oldData.letterDate).slice(0, 4));
    const nextYear = Number(String(nextLetterDate).slice(0, 4));
    const typeChanged = (oldData.type ?? "") !== (nextType ?? "");
    const flowChangedToOut = oldData.flow !== "out" && nextFlow === "out";
    const yearChanged =
      Number.isFinite(oldYear) && Number.isFinite(nextYear) ? oldYear !== nextYear : false;
    const numberMissing = !incomingNumber && !oldData.number?.trim();

    const shouldAutoRegenerate =
      nextFlow === "out" &&
      !!nextType &&
      (typeChanged || flowChangedToOut || yearChanged || numberMissing);

    let nextNumber = incomingNumber ?? oldData.number;
    if (shouldAutoRegenerate) {
      const parsedExisting =
        oldData.flow === "out" ? parseDcnOutNumber(oldData.number ?? "") : null;

      if (parsedExisting && !flowChangedToOut) {
        nextNumber = formatDcnOutNumber(
          parsedExisting.sequence,
          nextType,
          nextLetterDate,
        );
      } else {
        nextNumber = await getNextDcnOutNumber(tx, {
          typeCode: nextType,
          letterDate: nextLetterDate,
          excludeId: id,
        });
      }
    }

    const rows = await tx
      .update(dcn)
      .set({
        letterDate: nextLetterDate,
        number: nextNumber,
        type: nextType,
        toAddress: body.toAddress !== undefined ? body.toAddress : oldData.toAddress,
        fromAddress:
          body.fromAddress !== undefined ? body.fromAddress : oldData.fromAddress,
        subject: body.subject !== undefined ? body.subject : oldData.subject,
        flow: nextFlow,
        updatedAt: dbTime(),
      })
      .where(eq(dcn.id, id))
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "dcn",
      targetId: id,
      oldData,
      newData: row,
    });

    return row;
  });

  return successResponse(event, "DCN record updated", {
    ...updated,
    letterDate: toLocalDate(updated.letterDate as unknown as string),
    createdAt: toLocalTime(updated.createdAt),
    updatedAt: toLocalTime(updated.updatedAt),
  });
});
