import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { updateProfileSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";

export default defineEventHandler(async (event) => {
  console.log("===== [PROFILE PUT] START =====");

  /**
   * 1. Auth user
   */
  const authUser = event.context.user;
  if (!authUser?.id) {
    return errorResponse(event, "Unauthorized", 401);
  }

  /**
   * 2. Validasi body (Zod)
   */
  const body = await readBody(event);
  const data = parseBody(updateProfileSchema, body);

  /**
   * 3. Update DB
   */
  const updateData = {
    ...data,
    updatedAt: new Date(), // UTC
  };

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, authUser.id));

  console.log("✅ PROFILE UPDATED");

  return successResponse(event, "Profile updated successfully", {
    updatedAt: toLocalTime(updateData.updatedAt),
  });
});
