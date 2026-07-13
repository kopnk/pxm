import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { dcnCreateSchema } from "~/server/validation/dcn.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { getNextDcnOutNumber } from "~/server/utils/dcnNumber";
import { createDcnRecord } from "~/server/utils/dcnStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(dcnCreateSchema, await readBody(event));

  const nextNumber =
    body.flow === "out" && body.type
      ? await getNextDcnOutNumber({
          typeCode: body.type,
          letterDate: body.letterDate,
        })
      : body.number;

  const created = await createDcnRecord({
    letterDate: body.letterDate,
    number: nextNumber,
    type: body.type ?? null,
    toAddress: body.toAddress ?? null,
    fromAddress: body.fromAddress ?? null,
    subject: body.subject ?? null,
    flow: body.flow,
    createdUser: userId,
    updatedUser: null,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "dcn",
    targetId: created.id,
    newData: created,
  });

  return successResponse(
    event,
    "DCN record created",
    {
      ...created,
      letterDate: toLocalDate(created.letterDate as unknown as string),
      createdAt: toLocalTime(created.createdAt),
      updatedAt: toLocalTime(created.updatedAt),
    },
    201,
  );
});
