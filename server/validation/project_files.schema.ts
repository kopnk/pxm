import { z } from "zod";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

export const projectFileRefTableSchema = z.enum([
  "projects",
  "project_financials",
  "project_progress",
]);

export const externalFileUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => !/^(javascript|data|vbscript):/i.test(value),
    "Invalid URL scheme",
  )
  .refine(
    (value) => !/supabase\.co\/storage/i.test(value),
    "Use Upload File for Supabase storage",
  );

export const uploadProjectFileSchema = z.object({
  refTable: projectFileRefTableSchema,
  refId: z.string().uuid(),
  fileCategory: z.string().min(1),
  externalUrl: externalFileUrlSchema.optional(),
  fileName: z.string().trim().min(1).max(255).optional(),
});

export const createProjectFileSchema = z.object({
  refTable: projectFileRefTableSchema,
  refId: z.string().uuid(),
  fileCategory: z.string().min(1),
  fileName: z.string().trim().min(1).max(255).optional(),
  fileUrl: externalFileUrlSchema,
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  version: z.number().int().positive().optional(),
  isArchived: z.boolean().optional(),
});

export const updateProjectFileSchema = createProjectFileSchema.partial();

export const listProjectFilesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(DEFAULT_PAGE_LIMIT),
  search: z.string().optional(),
  refTable: projectFileRefTableSchema.optional(),
  refId: z.string().uuid().optional(),
  fileCategory: z.string().optional(),
});
