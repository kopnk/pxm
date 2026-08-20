export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_RULES = [
  {
    key: "minLength",
    label: `Minimum ${PASSWORD_MIN_LENGTH} characters`,
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: "uppercase",
    label: "At least one uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: "number",
    label: "At least one number",
    test: (value: string) => /\d/.test(value),
  },
  {
    key: "symbol",
    label: "At least one symbol",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function getPasswordRuleErrors(value: string): string[] {
  return PASSWORD_RULES
    .filter((rule) => !rule.test(value))
    .map((rule) => rule.label);
}

