import { defineEventHandler, getQuery } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  computeProjectFinancialsListTotals,
  listProjectFinancialRecords,
} from "~/server/utils/projectFinancialStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const records = await listProjectFinancialRecords({
    projectId: query.projectId ? String(query.projectId) : undefined,
    projectDetailId: query.projectDetailId
      ? String(query.projectDetailId)
      : undefined,
    search: query.search ? String(query.search) : undefined,
    status: query.status ? String(query.status) : undefined,
    flowDirection: query.flowDirection
      ? String(query.flowDirection)
      : undefined,
    taxSection:
      query.taxSection === "taxIn" ||
      query.taxSection === "taxOut" ||
      query.taxSection === "pph"
        ? query.taxSection
        : undefined,
  });
  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const totals = computeProjectFinancialsListTotals(records);
  const rows = records.slice(offset, offset + limit);

  return successResponse(event, "Project financials retrieved", {
    items: rows.map((row) => {
      return mapLocalTimestamps(row);
    }),
    page,
    limit,
    total,
    totalPages,
    totals: {
      partnerLineIdr: totals.partnerLineIdr,
      clientLineIdr: totals.clientLineIdr,
      taxInSection: totals.taxInSection,
      taxOutSection: totals.taxOutSection,
      pphSection: totals.pphSection,
    },
  });
});
