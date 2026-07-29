import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stage = process.argv[2];

if (stage !== "dev" && stage !== "prod") {
  console.error("Usage: node scripts/checks/cdk-synth-stage.mjs <dev|prod>");
  process.exit(1);
}

const outputDir = join(tmpdir(), `pxm-cdk-synth-${stage}-${Date.now()}`);

function synth() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "cdk",
      ["synth", "-c", `stage=${stage}`, "--output", outputDir],
      {
        stdio: "inherit",
        shell: true,
        env: process.env,
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`cdk synth exited with code ${code ?? 1}`));
    });
  });
}

try {
  await synth();
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
