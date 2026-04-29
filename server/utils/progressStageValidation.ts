import { createError } from "h3";
import { inArray } from "drizzle-orm";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";

type StageDataShape = Record<string, unknown> | null | undefined;

export async function validateStageDataKeys(stageData: StageDataShape) {
  const keys = Object.keys(stageData ?? {});
  if (!keys.length) return;

  const rows = await db
    .select({ code: progressStage.code })
    .from(progressStage)
    .where(inArray(progressStage.code, keys));

  const known = new Set(rows.map((r) => r.code));
  const unknown = keys.filter((k) => !known.has(k));

  if (unknown.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown progress stage code(s): ${unknown.join(", ")}`,
    });
  }
}
