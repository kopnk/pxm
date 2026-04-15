import { z } from "zod";

export const uploadProjectFileSchema = z.object({
  refTable: z.string().min(1),
  refId: z.string().uuid(),
  fileCategory: z.string().min(1),
});

export const createProjectFileSchema = z.object({
  refTable: z.string().min(1),
  refId: z.string().uuid(),
  fileCategory: z.string().min(1),
  fileName: z.string().optional(),
  fileUrl: z.string().url(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export const updateProjectFileSchema = createProjectFileSchema.partial();

export const listProjectFilesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  refTable: z.string().optional(),
  refId: z.string().uuid().optional(),
  fileCategory: z.string().optional(),
});
