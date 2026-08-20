import { listProjectDetailRecords } from "~/server/utils/projectDetailStore";
import {
  listProjectFinancialRecords,
} from "~/server/utils/projectFinancialStore";
import { listProjectFileRecords } from "~/server/utils/projectFileStore";
import {
  getProjectProgressRecordByDetailId,
  getProjectProgressRecordById,
} from "~/server/utils/projectProgressStore";

function createDependencyError(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 409;
  return error;
}

function formatDependencyCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

const DELETE_ORDER_HINT =
  "Delete from the leaf first: financial -> progress -> detail -> project.";

export async function ensureProjectDeleteAllowed(projectId: string) {
  const [details, financials, files] = await Promise.all([
    listProjectDetailRecords({ projectId }),
    listProjectFinancialRecords({ projectId }),
    listProjectFileRecords({ refTable: "projects", refId: projectId }),
  ]);

  if (details.length > 0) {
    throw createDependencyError(
      `Project cannot be deleted while ${formatDependencyCount(details.length, "project detail")} still exist. ${DELETE_ORDER_HINT}`,
    );
  }

  if (financials.length > 0) {
    throw createDependencyError(
      `Project cannot be deleted while ${formatDependencyCount(financials.length, "project financial")} still exist. ${DELETE_ORDER_HINT}`,
    );
  }

  if (files.length > 0) {
    throw createDependencyError(
      `Project cannot be deleted while ${formatDependencyCount(files.length, "project file")} still exist. Remove project files before deleting the project.`,
    );
  }
}

export async function ensureProjectDetailDeleteAllowed(detailId: string) {
  const [progress, financials] = await Promise.all([
    getProjectProgressRecordByDetailId(detailId),
    listProjectFinancialRecords({ projectDetailId: detailId }),
  ]);

  if (progress) {
    throw createDependencyError(
      `Project detail cannot be deleted while related project progress still exists. ${DELETE_ORDER_HINT}`,
    );
  }

  if (financials.length > 0) {
    throw createDependencyError(
      `Project detail cannot be deleted while ${formatDependencyCount(financials.length, "project financial")} still exist. ${DELETE_ORDER_HINT}`,
    );
  }
}

export async function ensureProjectProgressDeleteAllowed(progressId: string) {
  const [progress, files] = await Promise.all([
    getProjectProgressRecordById(progressId),
    listProjectFileRecords({ refTable: "project_progress", refId: progressId }),
  ]);

  if (!progress) {
    return;
  }

  const financials = (
    await listProjectFinancialRecords({ projectDetailId: progress.projectDetailId })
  ).filter((record) => record.projectProgressId === progressId);

  if (financials.length > 0) {
    throw createDependencyError(
      `Project progress cannot be deleted while ${formatDependencyCount(financials.length, "project financial")} still reference it. Delete financial records first.`,
    );
  }

  if (files.length > 0) {
    throw createDependencyError(
      `Project progress cannot be deleted while ${formatDependencyCount(files.length, "project file")} still exist. Remove progress files before deleting the progress.`,
    );
  }
}
