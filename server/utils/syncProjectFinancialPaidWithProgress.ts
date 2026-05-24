import { and, desc, eq } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { projectFinancials } from "~/server/db/schema/project_financials";
import {
  projectProgress,
  type StageData,
} from "~/server/db/schema/project_progress";
import { progressStage } from "~/server/db/schema/progress_stage";
import * as schema from "~/server/db/schema";
import { dbTime } from "~/server/utils/dbTime";
import { toLocalDate } from "~/server/utils/datetime";

type DbTx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** Normalisasi ke YYYY-MM-DD (Asia/Jakarta) atau null. */
export function dateOnlyYmd(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return toLocalDate(value);
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return toLocalDate(s);
}

function isPaidStageCode(code: string): boolean {
  return /^paid$/i.test(code);
}

/** Kode stage PAID persis seperti di master `progress_stage`. */
export async function resolvePaidProgressStageCode(
  tx: DbTx,
  stageData?: StageData | null,
): Promise<string> {
  const masterRows = await tx
    .select({ code: progressStage.code })
    .from(progressStage);

  const fromMaster = masterRows.find((r) => isPaidStageCode(r.code));
  if (fromMaster) return fromMaster.code;

  const fromData = Object.keys(stageData ?? {}).find((k) => isPaidStageCode(k));
  return fromData ?? "paid";
}

function applyPaidActualToStageData(
  stageData: StageData,
  paidStageCode: string,
  ymd: string | null,
): StageData {
  const next: StageData = { ...(stageData ?? {}) };

  const keysToUpdate = new Set<string>();
  for (const key of Object.keys(next)) {
    if (isPaidStageCode(key)) keysToUpdate.add(key);
  }
  keysToUpdate.add(paidStageCode);

  for (const key of keysToUpdate) {
    const prev = next[key] ?? {};
    next[key] = {
      ...prev,
      actual_approve_date: ymd,
      status: ymd ? "approved" : (prev.status ?? "pending"),
    };
  }

  if (!keysToUpdate.size) {
    next[paidStageCode] = {
      actual_approve_date: ymd,
      status: ymd ? "approved" : "pending",
    };
  }

  return next;
}

function readPaidActualFromStageData(
  stageData: StageData | null | undefined,
): string | null {
  if (!stageData) return null;
  for (const [key, stage] of Object.entries(stageData)) {
    if (!isPaidStageCode(key)) continue;
    const ymd = dateOnlyYmd(stage?.actual_approve_date);
    if (ymd) return ymd;
  }
  return null;
}

async function loadProgressByDetailId(tx: DbTx, projectDetailId: string) {
  const rows = await tx
    .select()
    .from(projectProgress)
    .where(eq(projectProgress.projectDetailId, projectDetailId))
    .limit(1);
  return rows[0] ?? null;
}

async function loadOutFlowFinancialByDetailId(
  tx: DbTx,
  projectDetailId: string,
) {
  const rows = await tx
    .select()
    .from(projectFinancials)
    .where(
      and(
        eq(projectFinancials.projectDetailId, projectDetailId),
        eq(projectFinancials.flowDirection, "out"),
      ),
    )
    .orderBy(desc(projectFinancials.updatedAt), desc(projectFinancials.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Samakan PAID actual (progress) ↔ paid_date (financial out-flow) per project detail.
 * Sumber utama jika keduanya beda: financial out-flow `paid_date`.
 */
export async function reconcilePaidSyncForProjectDetail(
  tx: DbTx,
  projectDetailId: string,
): Promise<void> {
  const detailId = projectDetailId?.trim();
  if (!detailId) return;

  const progress = await loadProgressByDetailId(tx, detailId);
  const financial = await loadOutFlowFinancialByDetailId(tx, detailId);
  if (!progress) return;

  const paidStageCode = await resolvePaidProgressStageCode(
    tx,
    progress.stageData,
  );
  const progressPaid = readPaidActualFromStageData(progress.stageData);
  const financialPaid = dateOnlyYmd(financial?.paidDate);

  if (financialPaid) {
    if (progressPaid === financialPaid) return;

    const nextStageData = applyPaidActualToStageData(
      progress.stageData ?? {},
      paidStageCode,
      financialPaid,
    );

    await tx
      .update(projectProgress)
      .set({
        stageData: nextStageData,
        updatedAt: dbTime(),
      })
      .where(eq(projectProgress.id, progress.id));

    if (financial && dateOnlyYmd(financial.paidDate) !== financialPaid) {
      await tx
        .update(projectFinancials)
        .set({
          paidDate: financialPaid,
          projectProgressId: progress.id,
          updatedAt: dbTime(),
        })
        .where(eq(projectFinancials.id, financial.id));
    } else if (financial && !financial.projectProgressId) {
      await tx
        .update(projectFinancials)
        .set({
          projectProgressId: progress.id,
          updatedAt: dbTime(),
        })
        .where(eq(projectFinancials.id, financial.id));
    }
    return;
  }

  if (progressPaid && financial) {
    await tx
      .update(projectFinancials)
      .set({
        paidDate: progressPaid,
        projectProgressId: progress.id,
        updatedAt: dbTime(),
      })
      .where(eq(projectFinancials.id, financial.id));
  }
}

export async function syncProgressPaidActualFromOutFlowFinancial(
  tx: DbTx,
  input: {
    projectDetailId: string;
    paidDate: string | null | undefined;
  },
): Promise<void> {
  const detailId = input.projectDetailId?.trim();
  if (!detailId) return;

  const progress = await loadProgressByDetailId(tx, detailId);
  if (!progress) return;

  const paidStageCode = await resolvePaidProgressStageCode(
    tx,
    progress.stageData,
  );
  const ymd = dateOnlyYmd(input.paidDate);

  const nextStageData = applyPaidActualToStageData(
    progress.stageData ?? {},
    paidStageCode,
    ymd,
  );

  await tx
    .update(projectProgress)
    .set({
      stageData: nextStageData,
      updatedAt: dbTime(),
    })
    .where(eq(projectProgress.id, progress.id));
}

export async function syncOutFlowFinancialPaidDateFromProgress(
  tx: DbTx,
  input: {
    projectDetailId: string;
    projectProgressId: string;
    paidActualDate: string | null | undefined;
  },
): Promise<void> {
  const detailId = input.projectDetailId?.trim();
  if (!detailId) return;

  const financial = await loadOutFlowFinancialByDetailId(tx, detailId);
  if (!financial) return;

  const ymd = dateOnlyYmd(input.paidActualDate);

  await tx
    .update(projectFinancials)
    .set({
      paidDate: ymd,
      projectProgressId: input.projectProgressId,
      updatedAt: dbTime(),
    })
    .where(eq(projectFinancials.id, financial.id));
}

export async function syncOutFlowFinancialAfterProgressSave(
  tx: DbTx,
  input: {
    projectDetailId: string;
    projectProgressId: string;
    stageData: StageData;
  },
): Promise<void> {
  const paidActual = readPaidActualFromStageData(input.stageData);

  await syncOutFlowFinancialPaidDateFromProgress(tx, {
    projectDetailId: input.projectDetailId,
    projectProgressId: input.projectProgressId,
    paidActualDate: paidActual,
  });
}

export async function syncProgressAfterOutFlowFinancialSave(
  tx: DbTx,
  input: {
    projectDetailId: string;
    flowDirection: string;
    paidDate: string | null | undefined;
  },
): Promise<void> {
  if (input.flowDirection !== "out") return;

  await syncProgressPaidActualFromOutFlowFinancial(tx, {
    projectDetailId: input.projectDetailId,
    paidDate: input.paidDate,
  });

  await reconcilePaidSyncForProjectDetail(tx, input.projectDetailId);
}
