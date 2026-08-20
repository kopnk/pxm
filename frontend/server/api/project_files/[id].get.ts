import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { withProjectFileSignedUrls } from "~/server/utils/projectFileStorage";
import { getProjectFileRecordById } from "~/server/utils/projectFileStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const file = await getProjectFileRecordById(id);

  if (!file || file.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  const [signedFile] = await withProjectFileSignedUrls([file]);
  return successResponse(event, "Document retrieved", signedFile);
});
