import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stage = process.argv[2];

if (stage !== "dev" && stage !== "prod") {
  console.error("Usage: node scripts/checks/cdk-synth-stage.mjs <dev|prod>");
  process.exit(1);
}

const outputDir = join(tmpdir(), `pxm-cdk-synth-${stage}-${Date.now()}`);

const child = spawn(
  "cdk",
  ["synth", "-c", `stage=${stage}`, "--output", outputDir],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
