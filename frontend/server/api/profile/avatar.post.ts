import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import {
  deleteAppFileObject,
  fileKeyFromManagedUrl,
  uploadAppFileObject,
} from "~/server/utils/appFilesStorage";
import { randomUUID } from "node:crypto";
import {
  getAppUserRecordById,
  updateAppUserRecord,
} from "~/server/utils/appUserStore";

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
  const oldUser = await getAppUserRecordById(userId);

  if (!oldUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  /* ================= UPLOAD NEW FILE ================= */
  const fileExt = file.type.split("/")[1] || "jpg";
  const filePath = `avatars/users/${userId}/${randomUUID()}.${fileExt}`;

  const { publicUrl } = await uploadAppFileObject({
    key: filePath,
    body: file.data,
    contentType: file.type,
    cacheControl: "public, max-age=31536000, immutable",
  });

  const oldAvatarKey = oldUser.user.avatarUrl
    ? fileKeyFromManagedUrl(oldUser.user.avatarUrl)
    : null;

  const updated = await updateAppUserRecord(userId, {
    avatarUrl: publicUrl,
    updatedUser: userId,
    updatedBy: authUser.email,
  });

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "users",
    targetId: userId,
    oldData: { avatarUrl: oldUser.user.avatarUrl },
    newData: { avatarUrl: publicUrl },
  });

  if (oldAvatarKey) {
    try {
      await deleteAppFileObject(oldAvatarKey);
    } catch {
      // Best-effort cleanup. Keep the new avatar reference even if old object deletion fails.
    }
  }
  return successResponse(event, "Avatar updated", {
    avatarUrl: publicUrl,
  });
});
