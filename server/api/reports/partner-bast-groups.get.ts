import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { partners } from "~/server/db/schema/partners";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const rows = await db
    .select({
      bastNumber: projectFinancials.bastNumber,
      lineCount: sql<number>`count(*)::int`,
      partnerName: sql<string | null>`max(${partners.name})`,
      bastDate: sql<string | null>`min(${projectFinancials.bastDate})`,
    })
    .from(projectFinancials)
    .leftJoin(partners, eq(projectFinancials.partnerId, partners.id))
    .where(
      and(
        eq(projectFinancials.flowDirection, "in"),
        isNotNull(projectFinancials.bastNumber),
        sql`trim(${projectFinancials.bastNumber}) <> ''`,
        ne(projectFinancials.status, "cancelled"),
      ),
    )
    .groupBy(projectFinancials.bastNumber)
    .orderBy(desc(sql`min(${projectFinancials.bastDate})`));

  const items = rows
    .filter((r) => r.bastNumber)
    .map((r) => ({
      bastNumber: r.bastNumber as string,
      lineCount: Number(r.lineCount ?? 0),
      partnerName: r.partnerName,
      bastDate: r.bastDate,
    }));

  return successResponse(event, "Partner BAST groups retrieved", { items });
});
