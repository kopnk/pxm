import { toLocalDate, toLocalTime } from "~/server/utils/datetime";

export function formatProjectProgressStageData(raw: unknown) {
  return Object.fromEntries(
    Object.entries((raw ?? {}) as Record<string, unknown>).map(([code, stage]) => {
      const value = stage as {
        plan_submit_date?: string | null;
        actual_approve_date?: string | null;
        remarks?: string | null;
        status?: string | null;
      };

      return [
        code,
        {
          ...value,
          plan_submit_date: toLocalDate(value.plan_submit_date ?? null),
          actual_approve_date: toLocalDate(value.actual_approve_date ?? null),
        },
      ];
    }),
  );
}

export function mapProjectProgressResponse<
  T extends {
    stageData?: unknown;
    createdAt?: string | null;
    updatedAt?: string | null;
  },
>(item: T) {
  return {
    ...item,
    stageData: formatProjectProgressStageData(item.stageData),
    createdAt: toLocalTime(item.createdAt ?? null),
    updatedAt: toLocalTime(item.updatedAt ?? null),
  };
}
