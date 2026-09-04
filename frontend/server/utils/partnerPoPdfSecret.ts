import {
  GetParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

let cachedSecret: string | undefined;
let pendingSecret: Promise<string> | undefined;

async function loadAwsParameter(parameterName: string): Promise<string> {
  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    }),
  );
  const secret = result.Parameter?.Value?.trim();
  if (!secret) {
    throw new Error("Partner PO PDF signing secret is empty.");
  }
  return secret;
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
  if (cachedSecret) return cachedSecret;

  const parameterName = process.env.PARTNER_PO_PDF_SECRET_PARAM?.trim();
  if (!parameterName) return "";

  pendingSecret ??= loadAwsParameter(parameterName);
  try {
    cachedSecret = await pendingSecret;
    return cachedSecret;
  } catch (error) {
    pendingSecret = undefined;
    throw error;
  }
}
