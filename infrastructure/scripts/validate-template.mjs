import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function validateTemplate(stage, outputDir) {
  const file = join(outputDir, `PxmStack-${stage}.template.json`);
  const template = JSON.parse(await readFile(file, "utf8"));
  const resources = Object.values(template.Resources ?? {});
  const failures = [];

  const apiHandler = resources.find(
    (resource) =>
      resource.Type === "AWS::Lambda::Function" &&
      resource.Properties?.FunctionName === `pxm-${stage}-api`,
  );
  const cookieSecret = apiHandler?.Properties?.Environment?.Variables?.AWS_AUTH_COOKIE_SECRET;
  const serializedCookieSecret = JSON.stringify(cookieSecret ?? null);
  if (
    !serializedCookieSecret.includes("secretsmanager") ||
    serializedCookieSecret.includes("AWS::StackId")
  ) {
    failures.push("API auth cookie must use a Secrets Manager dynamic reference");
  }

  for (const resource of resources) {
    const serialized = JSON.stringify(resource.Properties ?? {});
    if (serialized.includes('"AllowedOrigins":["*"]')) {
      failures.push("Wildcard S3 CORS origin is forbidden");
    }

    if (resource.Type === "AWS::IAM::Policy") {
      const statements = resource.Properties?.PolicyDocument?.Statement ?? [];
      for (const statement of statements) {
        const actions = Array.isArray(statement.Action)
          ? statement.Action
          : [statement.Action];
        if (actions.some((item) => String(item).startsWith("ses:")) && statement.Resource === "*") {
          failures.push("Wildcard SES permission is forbidden");
        }
      }
    }

    const path = resource.Metadata?.["aws:cdk:path"] ?? "";
    if (path.includes("/api/health/") && resource.Type === "AWS::ApiGateway::Method") {
      if (!["GET", "OPTIONS"].includes(resource.Properties?.HttpMethod)) {
        failures.push("Health endpoint only permits GET and OPTIONS");
      }
    }
    if (path.includes("/api/ready/") && resource.Type === "AWS::ApiGateway::Method") {
      if (!["GET", "OPTIONS"].includes(resource.Properties?.HttpMethod)) {
        failures.push("Ready endpoint only permits GET and OPTIONS");
      }
    }

    if (
      stage === "prod" &&
      path.endsWith("/WebBucket/Resource") &&
      (resource.DeletionPolicy !== "Retain" || resource.UpdateReplacePolicy !== "Retain")
    ) {
      failures.push("Production web bucket must be retained");
    }
  }

  if (failures.length) {
    throw new Error(`Unsafe CDK template:\n- ${failures.join("\n- ")}`);
  }
}
