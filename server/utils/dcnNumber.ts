import { and, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "~/server/db";
import { dcn } from "~/server/db/schema/dcn";

const DCN_NUMBER_PREFIX = "K310";

type DcnNumberQueryable = Pick<typeof db, "select">;
type ParsedDcnOutNumber = { sequence: number; year2: string };

function getYearFromDate(letterDate: string): number {
  const parsed = Number(String(letterDate).slice(0, 4));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid letter date");
  }
  return parsed;
}

export async function getNextDcnOutNumber(
  queryable: DcnNumberQueryable,
  params: {
    typeCode: string;
    letterDate: string;
    excludeId?: string;
  },
): Promise<string> {
  const year = getYearFromDate(params.letterDate);
  const yy = String(year).slice(-2);
  const typeCode = params.typeCode.trim();

  const where = and(
    eq(dcn.flow, "out"),
    gte(dcn.letterDate, `${year}-01-01`),
    lte(dcn.letterDate, `${year}-12-31`),
    params.excludeId ? ne(dcn.id, params.excludeId) : undefined,
  );

  const rows = await queryable
    .select({ number: dcn.number })
    .from(dcn)
    .where(where);

  const pattern = new RegExp(`^(\\d{4})\\.${DCN_NUMBER_PREFIX}\\.\\d{2}\\.${yy}$`);

  let maxSeq = 0;
  for (const row of rows) {
    const match = pattern.exec(row.number ?? "");
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${nextSeq}.${DCN_NUMBER_PREFIX}.${typeCode}.${yy}`;
}

export function parseDcnOutNumber(number: string): ParsedDcnOutNumber | null {
  const match = /^(\d{4})\.K310\.\d{2}\.(\d{2})$/.exec(number.trim());
  if (!match) return null;
  const sequence = Number(match[1]);
  if (!Number.isFinite(sequence) || sequence <= 0) return null;
  return { sequence, year2: match[2] };
}

export function formatDcnOutNumber(
  sequence: number,
  typeCode: string,
  letterDate: string,
): string {
  const year = getYearFromDate(letterDate);
  const yy = String(year).slice(-2);
  const paddedSequence = String(Math.floor(sequence)).padStart(4, "0");
  return `${paddedSequence}.${DCN_NUMBER_PREFIX}.${typeCode.trim()}.${yy}`;
}
