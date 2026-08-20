export type StageDateTypeFilter = "planned" | "actual";

export type ProjectProgressFilterRecord = {
  projectName?: string | null;
  poNumber?: string | null;
  contractNumber?: string | null;
  siteName?: string | null;
  materialName?: string | null;
  systemKey?: string | null;
  siteId?: string | null;
  neId?: string | null;
  materialId?: string | null;
  detailStatus?: string | null;
  stageData?: Record<
    string,
    {
      plan_submit_date?: string | null;
      actual_approve_date?: string | null;
      status?: string | null;
    }
  > | null;
};

export type ProjectProgressListFilterInput = {
  search?: string;
  project?: string;
  detail?: string;
  stage?: string;
  /** Hanya baris yang punya plan / actual date terisi di stage terpilih */
  stageDateType?: StageDateTypeFilter;
  status?: string;
};

const detailAllowed = ["active", "delay", "closed", "cancelled"] as const;
const stageAllowed = [
  "pending",
  "submitted",
  "approved",
  "delayed",
  "cancelled",
] as const;

function normalizeStageDateType(
  value?: string,
): StageDateTypeFilter | undefined {
  const v = value?.trim().toLowerCase();
  if (v === "planned" || v === "actual") return v;
  return undefined;
}

function hasPlanDate(stage?: {
  plan_submit_date?: string | null;
}) {
  return Boolean(String(stage?.plan_submit_date ?? "").trim());
}

function hasActualDate(stage?: {
  actual_approve_date?: string | null;
}) {
  return Boolean(String(stage?.actual_approve_date ?? "").trim());
}

function matchesStageCondition(
  record: ProjectProgressFilterRecord,
  stageKey: string,
  options?: {
    status?: string;
    stageDateType?: StageDateTypeFilter;
  },
) {
  const stage = record.stageData?.[stageKey];
  if (!stage) return false;

  if (options?.status && stage.status !== options.status) {
    return false;
  }

  if (options?.stageDateType === "planned" && !hasPlanDate(stage)) {
    return false;
  }

  if (options?.stageDateType === "actual" && !hasActualDate(stage)) {
    return false;
  }

  return true;
}

function anyStageMatchesStatus(
  record: ProjectProgressFilterRecord,
  stageStatus: string,
) {
  return Object.values(record.stageData ?? {}).some(
    (stage) => stage?.status === stageStatus,
  );
}

function buildProgressSearchHaystack(record: ProjectProgressFilterRecord) {
  return [
    record.projectName ?? "",
    record.poNumber ?? "",
    record.contractNumber ?? "",
    record.siteName ?? "",
    record.materialName ?? "",
    record.systemKey ?? "",
    record.siteId ?? "",
    record.neId ?? "",
    record.materialId ?? "",
    JSON.stringify(record.stageData ?? {}),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesProjectProgressListFilters(
  record: ProjectProgressFilterRecord,
  input: ProjectProgressListFilterInput,
) {
  const globalSearch = input.search?.trim();
  const project = input.project?.trim();
  const detail = input.detail?.trim();
  const stageCode = input.stage?.trim();
  const stageDateType = normalizeStageDateType(input.stageDateType);
  const statusFilter = input.status?.trim();

  if (globalSearch) {
    if (!buildProgressSearchHaystack(record).includes(globalSearch.toLowerCase())) {
      return false;
    }
  } else {
    if (project) {
      const pattern = project.toLowerCase();
      const projectMatch = [record.projectName ?? "", record.poNumber ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(pattern);
      if (!projectMatch) return false;
    }

    if (detail) {
      const detailPattern = detail.toLowerCase();
      const detailMatch = [
        record.siteName ?? "",
        record.materialName ?? "",
        record.systemKey ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(detailPattern);
      if (!detailMatch) return false;
    }
  }

  let stageFilterHandled = false;

  if (statusFilter) {
    if (statusFilter.startsWith("detail:")) {
      const detailStatus = statusFilter.slice("detail:".length);
      if ((detailAllowed as readonly string[]).includes(detailStatus)) {
        if (record.detailStatus !== detailStatus) return false;
      }
    } else if (statusFilter.startsWith("stage:")) {
      const stageStatus = statusFilter.slice("stage:".length);
      if ((stageAllowed as readonly string[]).includes(stageStatus)) {
        if (stageCode) {
          stageFilterHandled = true;
          if (
            !matchesStageCondition(record, stageCode, {
              status: stageStatus,
              stageDateType,
            })
          ) {
            return false;
          }
        } else {
          if (!anyStageMatchesStatus(record, stageStatus)) return false;
        }
      }
    } else if ((detailAllowed as readonly string[]).includes(statusFilter)) {
      if (record.detailStatus !== statusFilter) return false;
    } else if ((stageAllowed as readonly string[]).includes(statusFilter)) {
      if (stageCode) {
        stageFilterHandled = true;
        if (
          !matchesStageCondition(record, stageCode, {
            status: statusFilter,
            stageDateType,
          })
        ) {
          return false;
        }
      } else {
        if (!anyStageMatchesStatus(record, statusFilter)) return false;
      }
    }
  }

  if (stageCode && !stageFilterHandled) {
    if (
      !matchesStageCondition(record, stageCode, {
        stageDateType,
      })
    ) {
      return false;
    }
  }

  return true;
}
