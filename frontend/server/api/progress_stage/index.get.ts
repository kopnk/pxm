import { defineEventHandler, getQuery } from "h3";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { listProgressStageRecords } from "~/server/utils/progressStageStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const records = await listProgressStageRecords({
    search: query.search ? String(query.search) : undefined,
    stageType: query.stageType ? String(query.stageType) : undefined,
    isActive:
      query.isActive === undefined ? undefined : query.isActive === "true",
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);

  const items = records
    .slice(offset, offset + limit)
    .map((row) => mapLocalTimestamps(row));

  return successResponse(event, "Progress stages retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
