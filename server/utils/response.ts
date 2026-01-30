import { setResponseStatus } from "h3";
import { toLocalTime } from "~/server/utils/datetime";

export function successResponse(
  event: any,
  message = "Success",
  data: any = null,
  statusCode = 200
) {
  setResponseStatus(event, statusCode);

  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: toLocalTime(new Date()), // ✅ WIB
  };
}

export function errorResponse(
  event: any,
  message = "Error",
  statusCode = 500,
  errors: any = null
) {
  setResponseStatus(event, statusCode);

  return {
    success: false,
    statusCode,
    message,
    errors,
    timestamp: toLocalTime(new Date()), // ✅ WIB
  };
}
