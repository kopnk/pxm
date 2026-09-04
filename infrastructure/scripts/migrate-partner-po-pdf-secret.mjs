import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

function runAws(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("aws", [...args, "--no-cli-pager"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `AWS CLI exited with code ${code}`));
    });
  });
}

function awsConnectionArgs(extraArgs) {
  const result = [];
  const profileIndex = extraArgs.indexOf("--profile");
  if (profileIndex >= 0 && extraArgs[profileIndex + 1]) {
    result.push("--profile", extraArgs[profileIndex + 1]);
  }
  const regionContext = extraArgs.find((value, index) =>
    index > 0 && extraArgs[index - 1] === "-c" && value.startsWith("region="),
  );
  if (regionContext) result.push("--region", regionContext.slice("region=".length));
  return result;
}

export async function migratePartnerPoPdfSecret(stage, _templateDir, extraArgs = []) {
  const connectionArgs = awsConnectionArgs(extraArgs);
  let secretArn = "";
  try {
    secretArn = await runAws([
    "cloudformation", "list-stack-resources",
    "--stack-name", `PxmStack-${stage}`,
    "--query", "StackResourceSummaries[?starts_with(LogicalResourceId, 'PartnerPoPdfSecret')].PhysicalResourceId | [0]",
    "--output", "text",
    ...connectionArgs,
    ]);
    if (secretArn === "None") secretArn = "";
  } catch (error) {
    if (!String(error).includes("does not exist")) throw error;
  }

  const parameterName = `/pxm/${stage}/partner-po-pdf-secret`;
  let currentValue;

  try {
    currentValue = await runAws([
      "ssm", "get-parameter", "--name", parameterName, "--with-decryption",
      "--query", "Parameter.Value", "--output", "text", ...connectionArgs,
    ]);
  } catch (error) {
    if (!String(error).includes("ParameterNotFound")) throw error;
  }

  // Subsequent deploys no longer have the legacy CloudFormation resource.
  if (!secretArn && currentValue) return;

  const secretValue = secretArn
    ? await runAws([
        "secretsmanager", "get-secret-value", "--secret-id", secretArn,
        "--query", "SecretString", "--output", "text", ...connectionArgs,
      ])
    : randomBytes(48).toString("base64url");

  if (currentValue && currentValue !== secretValue) {
    throw new Error(
      `SSM parameter ${parameterName} already exists with a different value; migration stopped.`,
    );
  }

  if (!currentValue) {
    await runAws([
      "ssm", "put-parameter", "--name", parameterName,
      "--type", "SecureString", "--value", secretValue,
      "--description", `Encryption secret for pxm-${stage} authenticated PO PDF QR links`,
      ...connectionArgs,
    ]);
  }

  console.log(`[migration] preserved Partner PO PDF secret in ${parameterName}`);
}
