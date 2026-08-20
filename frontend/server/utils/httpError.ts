import { createError } from "h3";

export function createHttpErrorFromUnknown(
  error: unknown,
  fallbackMessage: string,
  fallbackStatusCode = 500,
) {
  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : fallbackStatusCode;

  return createError({
    statusCode,
    statusMessage: error instanceof Error ? error.message : fallbackMessage,
  });
}
