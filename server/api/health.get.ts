import { defineEventHandler } from "h3";
import { successResponse } from "~/server/utils/response";

export default defineEventHandler((event) =>
  successResponse(event, "Service is healthy", {
    status: "ok",
  }),
);
