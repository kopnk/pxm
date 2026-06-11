import { z } from "zod";

const regionTypeEnum = z.enum(["region", "sub_region", "city_kab"]);

function validateParentForType(
  data: { type: z.infer<typeof regionTypeEnum>; parentId?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.type === "region") {
    if (data.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Top-level region cannot have a parent",
        path: ["parentId"],
      });
    }
    return;
  }

  if (!data.parentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Parent is required for this type",
      path: ["parentId"],
    });
  }
}

/**
 * CREATE
 */
export const createRegionSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required"),
    type: regionTypeEnum,
    parentId: z.string().uuid().nullable().optional(),
  })
  .superRefine(validateParentForType);

/**
 * UPDATE
 */
export const updateRegionSchema = z.object({
  name: z.string().trim().min(2).optional(),
  type: regionTypeEnum.optional(),
  parentId: z.string().uuid().nullable().optional(),
});

/**
 * PARAM
 */
export const regionIdSchema = z.object({
  id: z.string().uuid(),
});

export { regionTypeEnum };
