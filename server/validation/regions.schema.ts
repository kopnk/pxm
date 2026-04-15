import { z } from "zod";

/**
 * CREATE
 */
export const createRegionSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["region", "sub_region", "city_kab"]),
  parentId: z.string().uuid().nullable().optional(),
});

/**
 * UPDATE
 */
export const updateRegionSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(["region", "sub_region", "city_kab"]).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

/**
 * PARAM
 */
export const regionIdSchema = z.object({
  id: z.string().uuid(),
});
