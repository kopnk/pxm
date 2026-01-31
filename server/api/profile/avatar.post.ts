import { defineEventHandler, readMultipartFormData } from "h3";
import { supabase } from "~/server/utils/supabase";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";

export default defineEventHandler(async (event) => {
  /**
   * 🔐 pastikan user login
   */
  const authUser = event.context.user;
  if (!authUser) {
    return errorResponse(event, "Unauthorized", 401);
  }

  const form = await readMultipartFormData(event);
  if (!form) {
    return errorResponse(event, "No form data", 400);
  }

  const file = form.find((f) => f.name === "avatar");
  if (!file) {
    return errorResponse(event, "Avatar file is required", 400);
  }

  if (!file.type?.startsWith("image/")) {
    return errorResponse(event, "Invalid image type", 400);
  }

  if (file.data.length > 2 * 1024 * 1024) {
    return errorResponse(event, "Max 2MB", 400);
  }

  const userId = authUser.id;

  /**
   * ============================
   * 🧹 OPSI B: HAPUS AVATAR LAMA
   * ============================
   * (DITAMBAHKAN, TIDAK MENGUBAH FLOW)
   */
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { avatarUrl: true },
  });

  if (existingUser?.avatarUrl) {
    const oldPath = existingUser.avatarUrl.split(
      "/storage/v1/object/public/avatars/"
    )[1];

    if (oldPath) {
      await supabase.storage
        .from("avatars")
        .remove([oldPath]);
    }
  }

  /**
   * ============================
   * 🆕 VERSIONED PATH (EXISTING)
   * ============================
   */
  const fileExt = file.type.split("/")[1] || "jpg";
  const versionedFilePath = `users/${userId}/${Date.now()}.${fileExt}`;

  /**
   * ☁️ Upload ke Supabase Storage (PATH BARU)
   */
  const { error } = await supabase.storage
    .from("avatars")
    .upload(versionedFilePath, file.data, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("[AVATAR UPLOAD]", error);
    return errorResponse(event, "Upload failed", 500);
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(versionedFilePath);

  /**
   * 🗄️ Update avatarUrl di users table
   */
  await db
    .update(users)
    .set({
      avatarUrl: data.publicUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return successResponse(event, "Avatar updated", {
    avatarUrl: data.publicUrl,
  });
});
