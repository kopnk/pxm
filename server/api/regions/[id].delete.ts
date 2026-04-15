import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { regionIdSchema } from "~/server/validation/regions.schema";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const { id } = regionIdSchema.parse(event.context.params);

  const [deleted] = await db
    .delete(regions)
    .where(eq(regions.id, id))
    .returning();

  if (!deleted) {
    return errorResponse(event, "Region not found", 404);
  }

  await logAudit({
    actorId: event.context.user.id,
    action: "DELETE",
    targetTable: "regions",
    targetId: id,
    oldData: deleted,
  });

  return successResponse(event, "Region deleted", {
    ...deleted,
    createdAt: toLocalTime(deleted.createdAt),
  });
});
