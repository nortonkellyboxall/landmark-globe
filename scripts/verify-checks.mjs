import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function listCheckFiles(testsDir) {
  return readdirSync(testsDir)
    .filter((name) => name.endsWith(".check.js"))
    .sort();
}

export function listPyCheckFiles(testsDir) {
  return readdirSync(testsDir)
    .filter((name) => name.endsWith(".check.py"))
    .sort();
}

function runChecks(command, files, testsDir) {
  for (const file of files) {
    const result = spawnSync(command, [join(testsDir, file)], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.exit(1);
    }
  }
}

function main() {
  const testsDir = join(import.meta.dirname, "..", "tests");
  runChecks("node", listCheckFiles(testsDir), testsDir);
  runChecks("python3", listPyCheckFiles(testsDir), testsDir);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
