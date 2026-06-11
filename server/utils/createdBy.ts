export function formatCreatorName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
}
