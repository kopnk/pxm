export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    data?: { message?: string };
    message?: string;
  };
  return e?.data?.message || e?.message || fallback;
}
