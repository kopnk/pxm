import { createError } from "h3";
import { listProgressStageRecords } from "~/server/utils/progressStageStore";

type StageDataShape = Record<string, unknown> | null | undefined;

export async function validateStageDataKeys(stageData: StageDataShape) {
  const keys = Object.keys(stageData ?? {});
  if (!keys.length) return;

  const rows = await listProgressStageRecords({ codes: keys });
  const known = new Set(rows.map((row) => row.code));
  const unknown = keys.filter((k) => !known.has(k));

  if (unknown.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown progress stage code(s): ${unknown.join(", ")}`,
    });
  }
}
