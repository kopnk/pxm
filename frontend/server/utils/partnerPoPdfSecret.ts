import {
  GetParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

const cachedSecrets = new Map<string, string>();
const pendingSecrets = new Map<string, Promise<string>>();

async function loadAwsParameter(parameterName: string): Promise<string> {
  const result = await ssmClient.send(
    new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
  );
  const secret = result.Parameter?.Value?.trim();
  if (!secret) throw new Error(`SSM secret ${parameterName} is empty.`);
  return secret;
}

async function resolveSsmSecret(parameterName: string): Promise<string> {
  const cached = cachedSecrets.get(parameterName);
  if (cached) return cached;

  const pending = pendingSecrets.get(parameterName) ?? loadAwsParameter(parameterName);
  pendingSecrets.set(parameterName, pending);
  try {
    const secret = await pending;
    cachedSecrets.set(parameterName, secret);
    return secret;
  } finally {
    pendingSecrets.delete(parameterName);
  }
}

/**
 * Local development may provide the secret directly. AWS receives only the
 * SSM SecureString parameter name and caches its value for the warm Lambda.
 */
export async function resolvePartnerPoPdfSecret(
  configuredSecret: unknown,
): Promise<string> {
  const localSecret = String(configuredSecret || "").trim();
  if (localSecret) return localSecret;
  const parameterName = process.env.PARTNER_PO_PDF_SECRET_PARAM?.trim();
  if (!parameterName) return "";

  return resolveSsmSecret(parameterName);
}

export async function resolveAuthCookieSecret(): Promise<string> {
  const localSecret = process.env.AWS_AUTH_COOKIE_SECRET?.trim();
  if (localSecret) return localSecret;

  const parameterName = process.env.AWS_AUTH_COOKIE_SECRET_PARAM?.trim();
  if (!parameterName) throw new Error("AWS auth cookie secret is not configured.");
  return resolveSsmSecret(parameterName);
}
