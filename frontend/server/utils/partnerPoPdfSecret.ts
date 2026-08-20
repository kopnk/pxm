import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

let cachedSecret: string | undefined;
let pendingSecret: Promise<string> | undefined;

async function loadAwsSecret(secretArn: string): Promise<string> {
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  const secret = result.SecretString?.trim();
  if (!secret) {
    throw new Error("Partner PO PDF signing secret is empty.");
  }
  return secret;
}

/**
 * Local development may provide the secret directly. AWS receives only a
 * Secrets Manager ARN and caches the fetched value for the warm Lambda.
 */
export async function resolvePartnerPoPdfSecret(
  configuredSecret: unknown,
): Promise<string> {
  const localSecret = String(configuredSecret || "").trim();
  if (localSecret) return localSecret;
  if (cachedSecret) return cachedSecret;

  const secretArn = process.env.PARTNER_PO_PDF_SECRET_ARN?.trim();
  if (!secretArn) return "";

  pendingSecret ??= loadAwsSecret(secretArn);
  try {
    cachedSecret = await pendingSecret;
    return cachedSecret;
  } catch (error) {
    pendingSecret = undefined;
    throw error;
  }
}
