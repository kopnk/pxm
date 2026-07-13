export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
};

export type ApiErrorEnvelope = {
  success: false;
  statusCode: number;
  message: string;
  errors: unknown;
  timestamp: string;
};

export type ApiEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readApiSuccessMessage(value: unknown): string | undefined {
  if (!isRecord(value) || value.success !== true) return undefined;

  const message = value.message;
  return typeof message === "string" && message.trim() ? message : undefined;
}
