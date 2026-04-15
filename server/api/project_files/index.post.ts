import {
  defineEventHandler,
  readMultipartFormData,
  createError,
} from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { supabase } from "~/server/utils/supabase";
import { randomUUID } from "crypto";
import { uploadProjectFileSchema } from "~/server/validation/project_files.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const form = await readMultipartFormData(event);
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  let rawFields: any = {};
  let file: any;

  for (const field of form) {
    if (field.name === "file") {
      file = field;
    } else {
      rawFields[field.name] = field.data.toString();
    }
  }

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: "File is required" });
  }

  const { refTable, refId, fileCategory } =
    uploadProjectFileSchema.parse(rawFields);

  const maxSize = 10 * 1024 * 1024;
  if (file.data.length > maxSize) {
    throw createError({
      statusCode: 400,
      statusMessage: "File too large (max 10MB)",
    });
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid file type",
    });
  }

  const fileExt = file.filename?.split(".").pop();
  const uniqueName = `${randomUUID()}.${fileExt}`;
  const bucketName = "project-files";
  const filePath = `${refTable}/${refId}/${uniqueName}`;

  const uploadToBucket = async () =>
    supabase.storage
      .from(bucketName)
      .upload(filePath, file.data, {
        contentType: file.type,
      });

  let { error: uploadError } = await uploadToBucket();

  if (uploadError?.message?.toLowerCase().includes("bucket not found")) {
    const { error: createBucketError } = await supabase.storage.createBucket(
      bucketName,
      { public: true },
    );

    if (createBucketError && !createBucketError.message?.toLowerCase().includes("already exists")) {
      throw createError({
        statusCode: 500,
        statusMessage: createBucketError.message,
      });
    }

    ({ error: uploadError } = await uploadToBucket());
  }

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: uploadError.message,
    });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  const created = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(projectFiles)
      .values({
        refTable,
        refId,
        fileCategory,
        fileName: file.filename ?? null,
        fileUrl: publicUrl,
        fileSize: file.data.length,
        mimeType: file.type ?? null,
        version: 1,
        uploadedBy: userId,
        isArchived: false,
      })
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "project_files",
      targetId: row.id,
      newData: row,
    });

    return row;
  });

  return successResponse(event, "File uploaded", created, 201);
});
