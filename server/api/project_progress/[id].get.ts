import { createError, defineEventHandler } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { mapProjectProgressResponse } from "~/server/utils/projectProgressResponse";
import { getProjectProgressListItemById } from "~/server/utils/projectProgressStore";
import { successResponse } from "~/server/utils/response";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const item = await getProjectProgressListItemById(id);
  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project progress not found",
    });
  }
  return successResponse(
    event,
    "Project progress retrieved",
    mapProjectProgressResponse(item),
  );
});
