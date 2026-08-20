export function normalizeReportDocumentNumber(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("id-ID");
}

export function matchesReportDocumentNumber(
  storedValue: unknown,
  requestedValue: unknown,
) {
  const requested = normalizeReportDocumentNumber(requestedValue);
  return requested.length > 0 && normalizeReportDocumentNumber(storedValue) === requested;
}
