import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateTemplate } from "./validate-template.mjs";

const [action, stage, ...extraArgs] = process.argv.slice(2);
if (!["synth", "deploy"].includes(action) || !["dev", "prod"].includes(stage)) {
  console.error("Usage: node scripts/cdk-stage.mjs <synth|deploy> <dev|prod>");
  process.exit(1);
}

const cdkCli = resolve("node_modules/aws-cdk/bin/cdk");

function runCdk(args) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [cdkCli, ...args], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolveExit(code ?? 1));
  });
}

const validationOutput = join(tmpdir(), `pxm-cdk-${stage}-${Date.now()}`);

try {
  const synthCode = await runCdk([
    "synth",
    "-c",
    `stage=${stage}`,
    "--output",
    validationOutput,
    "--quiet",
    ...extraArgs,
  ]);
  if (synthCode !== 0) throw new Error(`cdk synth exited with code ${synthCode}`);

  await validateTemplate(stage, validationOutput);
  console.log(`[cdk] ${stage} template validation passed`);

  if (action === "deploy") {
    const deployCode = await runCdk([
      "deploy",
      "-c",
      `stage=${stage}`,
      "--output",
      `.cdk.out-verify/${stage}`,
      "--outputs-file",
      `.cdk-outputs/${stage}.json`,
      ...extraArgs,
    ]);
    if (deployCode !== 0) throw new Error(`cdk deploy exited with code ${deployCode}`);
  }
} finally {
  await rm(validationOutput, { recursive: true, force: true });
}
