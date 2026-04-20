/**
 * Fail build if Nitro output still pulls dayjs plugins (old stack / wrong branch).
 */
import fs from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (p.endsWith(".mjs")) acc.push(p);
  }
  return acc;
}

const root = path.join(".output", "server", "chunks");
const files = walk(root);
const bad = [];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (s.includes("dayjs/plugin")) bad.push(f);
}
if (bad.length) {
  console.error(
    "[verify-no-dayjs] Output still references dayjs/plugin. Use latest source (Intl datetime), then: rm -rf .output && npm run build\n" +
      bad.slice(0, 20).join("\n") +
      (bad.length > 20 ? "\n..." : "")
  );
  process.exit(1);
}
console.log("[verify-no-dayjs] ok (" + files.length + " chunks)");
