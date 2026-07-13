import { setResponseStatus, type H3Event } from "h3";
import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "~/lib/apiEnvelope";
import { toLocalTime } from "~/server/utils/datetime";

function buildTimestamp() {
  return toLocalTime(new Date()) ?? new Date().toISOString();
}

export function successResponse<T>(
  event: H3Event,
  message = "Success",
  data: T | null = null,
  statusCode = 200,
): ApiSuccessEnvelope<T | null> {
  setResponseStatus(event, statusCode);

  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: buildTimestamp(),
  };
}

export function errorResponse(
  event: H3Event,
  message = "Error",
  statusCode = 500,
  errors: unknown = null,
): ApiErrorEnvelope {
  setResponseStatus(event, statusCode);

  return {
    success: false,
    statusCode,
    message,
    errors,
    timestamp: buildTimestamp(),
  };
}
