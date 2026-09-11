import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--test-concurrency=1",
    "getafter-probe.test.js",
    "module2.rules.test.js",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }
);
process.exit(result.status ?? 1);
