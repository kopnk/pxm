import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  console.log("===== [PROFILE PUT] START =====");

  try {
    /**
     * 1. Auth user dari middleware
     */
    const authUser = event.context.user;
    console.log("AUTH USER:", authUser);

    if (!authUser?.id) {
      console.log("❌ Unauthorized");
      return errorResponse(event, "Unauthorized", 401);
    }

    /**
     * 2. Read body (SAFE)
     */
    const body = (await readBody(event)) || {};
    console.log("REQUEST BODY:", body);

    if (Object.keys(body).length === 0) {
      return errorResponse(event, "Request body is required", 400);
    }

    /**
     * 3. Whitelist field yang boleh diupdate
     * ⚠️ HARUS pakai camelCase (schema Drizzle)
     * ⚠️ updatedAt tetap UTC (new Date())
     */
    const updateData: Record<string, any> = {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      region: body.region,
      area: body.area,
      avatarUrl: body.avatarUrl,
      updatedAt: new Date(), // UTC
    };

    /**
     * 4. Hapus field undefined (biar tidak overwrite)
     */
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log("SANITIZED UPDATE DATA:", updateData);

    if (Object.keys(updateData).length === 1) {
      // hanya updatedAt
      return errorResponse(event, "No valid fields to update", 400);
    }

    /**
     * 5. Update DB
     */
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authUser.id));

    console.log("✅ PROFILE UPDATED");

    /**
     * 6. OPTIONAL: return updatedAt dalam local time (WIB)
     * (berguna kalau FE mau langsung update state)
     */
    return successResponse(event, "Profile updated successfully", {
      updatedAt: toLocalTime(updateData.updatedAt),
    });

  } catch (err) {
    console.error("🔥 [PROFILE PUT ERROR]", err);
    return errorResponse(event, "Internal server error", 500);
  } finally {
    console.log("===== [PROFILE PUT] END =====");
  }
});
