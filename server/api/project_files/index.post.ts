import {
  defineEventHandler,
  readMultipartFormData,
  readBody,
  getHeader,
  createError,
  type H3Event,
} from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { supabase } from "~/server/utils/supabase";
import { randomUUID } from "crypto";
import {
  uploadProjectFileSchema,
  createProjectFileSchema,
} from "~/server/validation/project_files.schema";
import { requireFirstRow } from "~/server/utils/requireFirstRow";

const displayNameFromUrl = (fileUrl: string, fileName?: string | null) =>
  fileName?.trim() ||
  fileUrl.split(/[/\\]/).filter(Boolean).pop() ||
  "External document";

const insertExternalUrlRecord = async (
  event: H3Event,
  userId: string,
  input: {
    refTable: string;
    refId: string;
    fileCategory: string;
    fileUrl: string;
    fileName?: string | null;
  },
) => {
  const created = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(projectFiles)
      .values({
        refTable: input.refTable,
        refId: input.refId,
        fileCategory: input.fileCategory,
        fileName: displayNameFromUrl(input.fileUrl, input.fileName),
        fileUrl: input.fileUrl,
        fileSize: null,
        mimeType: null,
        version: 1,
        uploadedBy: userId,
        isArchived: false,
      })
      .returning();

    const row = requireFirstRow(rows, "File record not created");

    await logAudit({
      event,
      actorId: userId,
      action: "CREATE",
      targetTable: "project_files",
      targetId: row.id,
      newData: row,
    });

    return row;
  });

  return successResponse(event, "Document URL saved", created, 201);
};

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const contentType = getHeader(event, "content-type") || "";

  if (contentType.includes("application/json")) {
    const body = createProjectFileSchema.parse(await readBody(event));

    return insertExternalUrlRecord(event, userId, {
      refTable: body.refTable,
      refId: body.refId,
      fileCategory: body.fileCategory,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
    });
  }

  const form = await readMultipartFormData(event);
  if (!form) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid multipart request",
    });
  }

  let rawFields: Record<string, string> = {};
  let file: (typeof form)[number] | undefined;

  for (const field of form) {
    const fieldName = field.name;
    if (!fieldName) continue;
    if (fieldName === "file") {
      file = field;
    } else {
      rawFields[fieldName] = field.data.toString();
    }
  }

  const parsed = uploadProjectFileSchema.parse(rawFields);
  const {
    refTable,
    refId,
    fileCategory,
    externalUrl,
    fileName: externalFileName,
  } = parsed;

  if (!file && !externalUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "File or document URL is required",
    });
  }

  if (!file && externalUrl) {
    return insertExternalUrlRecord(event, userId, {
      refTable,
      refId,
      fileCategory,
      fileUrl: externalUrl,
      fileName: externalFileName,
    });
  }

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: "File is required" });
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.data.length > maxSize) {
    throw createError({
      statusCode: 400,
      statusMessage: "File too large (max 10MB)",
    });
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type || "")) {
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

    if (
      createBucketError &&
      !createBucketError.message?.toLowerCase().includes("already exists")
    ) {
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

    const row = requireFirstRow(rows, "File record not created");

    await logAudit({
      event,
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
