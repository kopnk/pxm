import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
 // console.log("===== [PROFILE GET] START =====");
// console.log("PATH:", event.path);

  try {
    /**
     * 1. Auth user dari middleware
     */
    const authUser = event.context.user;
    //console.log("AUTH USER:", authUser);

    if (!authUser?.id) {
   //   console.log("❌ Unauthorized");
      return errorResponse(event, "Unauthorized", 401);
    }

    /**
     * 2. Query user
     */
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        region: users.region,
        area: users.area,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

  //  console.log("RAW DB RESULT:", rows);

    const user = rows?.[0];
    if (!user) {
    //  console.log("❌ USER NOT FOUND");
      return errorResponse(event, "User not found", 404);
    }

    /**
     * 3. Convert datetime → local timezone (WIB)
     */
    const formattedUser = {
      ...user,
      createdAt: toLocalTime(user.createdAt),
      updatedAt: toLocalTime(user.updatedAt),
      lastLoginAt: toLocalTime(user.lastLoginAt),
    };

   // console.log("✅ USER FOUND:", formattedUser.email);
   // console.log("===== [PROFILE GET] SUCCESS =====");

    /**
     * 4. Response sukses
     */
    return successResponse(event, "Profile retrieved", formattedUser);

  } catch (err) {
    console.error("🔥 [PROFILE GET ERROR]");
    console.error(err);

    return errorResponse(event, "Internal server error", 500);
  } finally {
    console.log("===== [PROFILE GET] END =====");
  }
});
