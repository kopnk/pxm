import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { regionIdSchema } from "~/server/validation/regions.schema";
import { mapLocalTimestamps } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { id } = regionIdSchema.parse(event.context.params);

  const [deleted] = await db
    .delete(regions)
    .where(eq(regions.id, id))
    .returning();

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Region not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "regions",
    targetId: id,
    oldData: deleted,
  });

  return successResponse(event, "Region deleted", {
    ...mapLocalTimestamps(deleted),
  });
});
