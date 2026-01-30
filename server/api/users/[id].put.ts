import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const id = event.context.params.id;
  const body = (await readBody(event)) || {};
  const actor = event.context.user;

  /**
   * 1. Ambil data lama (WAJIB untuk audit)
   */
  const oldUser = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      region: users.region,
      area: users.area,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!oldUser) {
    return errorResponse(event, "User not found", 404);
  }

  /**
   * 2. BASE UPDATE DATA (admin & superadmin)
   */
  const updateData: any = {
    firstName: body.firstName,
    lastName: body.lastName,
    region: body.region,
    area: body.area,
    phone: body.phone,
    updatedAt: new Date(),
  };

  /**
   * 3. TAMBAHAN KHUSUS SUPERADMIN
   */
  if (actor.role === "superadmin") {
    updateData.role = body.role;
    updateData.isActive = body.isActive;
  }

  /**
   * 4. HAPUS FIELD UNDEFINED
   */
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  /**
   * 5. VALIDASI ADA YANG DIUPDATE ATAU TIDAK
   */
  if (Object.keys(updateData).length === 1) {
    // cuma updatedAt
    return errorResponse(event, "No valid fields to update", 400);
  }

  /**
   * 6. UPDATE DATABASE
   */
  await db.update(users).set(updateData).where(eq(users.id, id));

  /**
   * 7. AUDIT (SETELAH UPDATE, DATA SUDAH BERSIH)
   */
  await logAudit({
    actorId: actor.id,
    action: "UPDATE",
    targetTable: "users",
    targetId: id,
    oldData: oldUser,
    newData: updateData,
  });

  return successResponse(event, "User updated successfully");
});
