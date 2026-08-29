import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function listCheckFiles(testsDir) {
  return readdirSync(testsDir)
    .filter((name) => name.endsWith(".check.js"))
    .sort();
}

function main() {
  const testsDir = join(import.meta.dirname, "..", "tests");
  const files = listCheckFiles(testsDir);

  for (const file of files) {
    const result = spawnSync("node", [join(testsDir, file)], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.exit(1);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
