import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveStageName, stackName } from "./dev-stage-config.mjs";

const stageArg = process.argv[2];
const outputKey = process.argv[3];
const showAll = process.argv.includes("--all");

if (stageArg !== "dev" && stageArg !== "prod") {
  console.error('Usage: node scripts/dev/read-cdk-output.mjs <dev|prod> [OutputKey]');
  process.exit(1);
}

const stage = resolveStageName(stageArg);
const currentStackName = stackName(stage);
const filePath = resolve(`.cdk-outputs/${stage}.json`);

let raw;
try {
  raw = readFileSync(filePath, "utf8");
} catch {
  console.error(
    `CDK output file not found for stage "${stage}". Run "npm run cdk:deploy:${stage}" first.`,
  );
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error(`Invalid JSON in ${filePath}. Re-run the CDK deploy for stage "${stage}".`);
  process.exit(1);
}

const stackOutputs = parsed?.[currentStackName];
if (!stackOutputs || typeof stackOutputs !== "object") {
  console.error(
    `Stack outputs for "${currentStackName}" were not found in ${filePath}.`,
  );
  process.exit(1);
}

if (outputKey && outputKey !== "--all") {
  const value = stackOutputs[outputKey];
  if (typeof value !== "string" || !value.trim()) {
    console.error(`Output "${outputKey}" was not found for stage "${stage}".`);
    process.exit(1);
  }

  console.log(value);
  process.exit(0);
}

if (showAll) {
  console.log(JSON.stringify(stackOutputs, null, 2));
  process.exit(0);
}

console.error(
  `Refusing to print all CDK outputs by default. Pass an output key or use "--all". Available keys: ${Object.keys(stackOutputs).join(", ")}`,
);
process.exit(1);
