import { z } from "zod";

export const progressStatusEnum = z.enum([
  "pending",
  "submitted",
  "approved",
  "delayed",
  "cancelled",
]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const stageSchema = z.object({
  plan_submit_date: dateOnlySchema.optional().nullable(),
  actual_approve_date: dateOnlySchema.optional().nullable(),
  status: progressStatusEnum.optional(),
});

export const stageDataSchema = z.record(
  z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Stage code must be lowercase alphanumeric/underscore"),
  stageSchema
);

export const createProjectProgressSchema = z.object({
  projectId: z.string().uuid(),
  projectDetailId: z.string().uuid(),
  stageData: stageDataSchema.optional(),
  /** Disimpan di project_details (satu id detail) */
  remarksProjectsDetails: z.string().optional().nullable(),
  remarksDelay: z.string().optional().nullable(),
  remarksCancel: z.string().optional().nullable(),
});

export const updateProjectProgressSchema =
  createProjectProgressSchema.partial();

/** Query untuk `GET /api/project_progress/export` (sama filter seperti list). */
export const projectProgressExportQueryZ = z.object({
  search: z.string().max(500).optional(),
  stage: z.string().max(120).optional(),
  status: z.string().max(120).optional(),
  project: z.string().max(200).optional(),
  detail: z.string().max(200).optional(),
});