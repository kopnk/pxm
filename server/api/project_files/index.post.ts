import {
  defineEventHandler,
  readMultipartFormData,
  readBody,
  getHeader,
  createError,
  type H3Event,
} from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { randomUUID } from "crypto";
import {
  PROJECT_FILES_PREFIX,
  toProjectStorageUrl,
} from "~/server/utils/projectFileStorage";
import {
  uploadProjectFileSchema,
  createProjectFileSchema,
} from "~/server/validation/project_files.schema";
import { uploadAppFileObject } from "~/server/utils/appFilesStorage";
import { createProjectFileRecord } from "~/server/utils/projectFileStore";
import { withProjectFileSignedUrls } from "~/server/utils/projectFileStorage";

const displayNameFromUrl = (fileUrl: string, fileName?: string | null) =>
  fileName?.trim() ||
  fileUrl.split(/[/\\]/).filter(Boolean).pop() ||
  "External document";

const matchesFileSignature = (data: Buffer, mimeType?: string | null) => {
  if (mimeType === "application/pdf") {
    return data.subarray(0, 4).toString("utf8") === "%PDF";
  }

  if (mimeType === "image/png") {
    return data.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (mimeType === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }

  return false;
};

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
  const created = await createProjectFileRecord({
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
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "project_files",
    targetId: created.id,
    newData: created,
  });

  const [signedFile] = await withProjectFileSignedUrls([created]);
  return successResponse(event, "Document URL saved", signedFile, 201);
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

  if (!matchesFileSignature(file.data, file.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "File content does not match file type",
    });
  }

  const fileExt = file.filename?.split(".").pop();
  const uniqueName = `${randomUUID()}.${fileExt}`;
  const filePath = `${PROJECT_FILES_PREFIX}/${refTable}/${refId}/${uniqueName}`;

  await uploadAppFileObject({
    key: filePath,
    body: file.data,
    contentType: file.type,
  });

  const created = await createProjectFileRecord({
    refTable,
    refId,
    fileCategory,
    fileName: file.filename ?? null,
    fileUrl: toProjectStorageUrl(`${refTable}/${refId}/${uniqueName}`),
    fileSize: file.data.length,
    mimeType: file.type ?? null,
    version: 1,
    uploadedBy: userId,
    isArchived: false,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "project_files",
    targetId: created.id,
    newData: created,
  });

  const [signedFile] = await withProjectFileSignedUrls([created]);
  return successResponse(event, "Document uploaded", signedFile, 201);
});

