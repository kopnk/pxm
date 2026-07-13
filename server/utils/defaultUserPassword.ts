export function getDefaultUserPassword() {
  const password = process.env.AWS_DEFAULT_USER_PASSWORD?.trim();

  if (!password) {
    throw new Error("AWS_DEFAULT_USER_PASSWORD is missing or empty.");
  }

  return password;
}
