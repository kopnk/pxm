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
import { requireProjectFileAccess } from "~/server/utils/projectFileAccess";
import { parseBody } from "~/server/utils/zod";
import {
  assertUploadedFile,
  sanitizeDisplayFileName,
} from "~/server/utils/uploadValidation";

const displayNameFromUrl = (fileUrl: string, fileName?: string | null) =>
  sanitizeDisplayFileName(fileName) ||
  sanitizeDisplayFileName(fileUrl.split(/[/\\]/).filter(Boolean).pop()) ||
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

const PROJECT_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
const PROJECT_FILE_MAX_BYTES = 10 * 1024 * 1024;
/** Attaching a document is part of creating or editing the referenced record. */
const ATTACH_ACTIONS = ["create", "update"] as const;

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const contentType = getHeader(event, "content-type") || "";

  if (contentType.includes("application/json")) {
    const body = parseBody(createProjectFileSchema, await readBody(event));
    const denied = requireProjectFileAccess(event, body.refTable, ATTACH_ACTIONS);
    if (denied) return denied;

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

  const rawFields: Record<string, string> = {};
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

  const parsed = parseBody(uploadProjectFileSchema, rawFields);
  const {
    refTable,
    refId,
    fileCategory,
    externalUrl,
    fileName: externalFileName,
  } = parsed;

  const denied = requireProjectFileAccess(event, refTable, ATTACH_ACTIONS);
  if (denied) return denied;

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

  const { mimeType, extension } = assertUploadedFile(file, {
    allowedTypes: PROJECT_FILE_TYPES,
    maxBytes: PROJECT_FILE_MAX_BYTES,
  });

  const uniqueName = `${randomUUID()}.${extension}`;
  const filePath = `${PROJECT_FILES_PREFIX}/${refTable}/${refId}/${uniqueName}`;

  await uploadAppFileObject({
    key: filePath,
    body: file.data,
    contentType: mimeType,
  });

  const created = await createProjectFileRecord({
    refTable,
    refId,
    fileCategory,
    fileName: sanitizeDisplayFileName(file.filename),
    fileUrl: toProjectStorageUrl(`${refTable}/${refId}/${uniqueName}`),
    fileSize: file.data.length,
    mimeType,
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

