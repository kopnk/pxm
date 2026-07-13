import { defineEventHandler } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { listProjectFinancialRecords } from "~/server/utils/projectFinancialStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const rows = (await listProjectFinancialRecords({
    flowDirection: "in",
  })).filter(
    (row) => row.status !== "cancelled" && Boolean(String(row.bastNumber ?? "").trim()),
  );

  const grouped = new Map<
    string,
    { bastNumber: string; lineCount: number; partnerName: string | null; bastDate: string | null }
  >();

  for (const row of rows) {
    const bastNumber = String(row.bastNumber ?? "").trim();
    if (!bastNumber) continue;

    const current = grouped.get(bastNumber);
    if (!current) {
      grouped.set(bastNumber, {
        bastNumber,
        lineCount: 1,
        partnerName: row.partnerName ?? null,
        bastDate: row.bastDate ?? null,
      });
      continue;
    }

    current.lineCount += 1;
    current.partnerName = current.partnerName ?? row.partnerName ?? null;
    if (!current.bastDate || (row.bastDate && row.bastDate < current.bastDate)) {
      current.bastDate = row.bastDate ?? current.bastDate;
    }
  }

  const items = [...grouped.values()].sort((a, b) =>
    String(b.bastDate ?? "").localeCompare(String(a.bastDate ?? "")),
  );

  return successResponse(event, "Partner BAST groups retrieved", { items });
});
