import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { withProjectFileSignedUrls } from "~/server/utils/projectFileStorage";
import { listProjectFilesSchema } from "~/server/validation/project_files.schema";
import { listProjectFileRecords } from "~/server/utils/projectFileStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = listProjectFilesSchema.parse(getQuery(event));
  const { page, limit, offset } = buildPagination(query);

  const records = await listProjectFileRecords({
    search: query.search,
    refTable: query.refTable,
    refId: query.refId,
    fileCategory: query.fileCategory,
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const items = records.slice(offset, offset + limit);

  return successResponse(event, "Documents retrieved", {
    items: await withProjectFileSignedUrls(items),
    page,
    limit,
    total,
    totalPages,
  });
});
