import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { supabase } from "~/server/utils/supabase";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const authUser = event.context.user;

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= READ FORM ================= */
  const form = await readMultipartFormData(event);

  if (!form) {
    throw createError({
      statusCode: 400,
      statusMessage: "No form data",
    });
  }

  const file = form.find((f) => f.name === "avatar");

  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: "Avatar file is required",
    });
  }

  if (!file.type?.startsWith("image/")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid image type",
    });
  }

  if (file.data.length > 2 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      statusMessage: "Max 2MB allowed",
    });
  }

  const userId = authUser.id;

  /* ================= GET OLD AVATAR ================= */
  const rows = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const oldUser = rows[0];

  if (!oldUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  /* ================= DELETE OLD AVATAR ================= */
  if (oldUser.avatarUrl) {
    const oldPath = oldUser.avatarUrl.split(
      "/storage/v1/object/public/avatars/"
    )[1];

    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
  }

  /* ================= UPLOAD NEW FILE ================= */
  const fileExt = file.type.split("/")[1] || "jpg";
  const filePath = `users/${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file.data, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Upload failed",
    });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  /* ================= UPDATE DB (TRANSACTION SAFE) ================= */
  await db.transaction(async (tx) => {

    await tx
      .update(users)
      .set({
        avatarUrl: publicUrl,
        updatedAt: dbTime(),
      })
      .where(eq(users.id, userId));

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "users",
      targetId: userId,
      newData: { avatarUrl: publicUrl },
    });
  });

  return successResponse(event, "Avatar updated", {
    avatarUrl: publicUrl,
  });
});
