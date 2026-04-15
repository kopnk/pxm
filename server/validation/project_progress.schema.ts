import { z } from "zod";

export const progressStatusEnum = z.enum([
  "pending",
  "submitted",
  "approved",
  "delayed",
  "cancelled",
]);

export const stageSchema = z.object({
  plan_submit_date: z.string().optional().nullable(),
  actual_approve_date: z.string().optional().nullable(),
  status: progressStatusEnum.optional(),
});

export const stageDataSchema = z.record(
  z.string(),
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