import { ZodSchema } from "zod";
import { createError } from "h3";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation error",
      data: result.error.flatten(),
    });
  }

  return result.data;
}
