/** Label audit user — email (immutable), bukan first/last name. */
export function formatAuditUserEmail(email?: string | null): string | null {
  const value = String(email ?? "").trim();
  return value || null;
}
