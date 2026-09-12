import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { listCheckFiles, listPyCheckFiles } from "../scripts/verify-checks.mjs";

const testsDir = dirname(fileURLToPath(import.meta.url));
const files = listCheckFiles(testsDir);
const pyFiles = listPyCheckFiles(testsDir);

assert.ok(files.includes("place.check.js"));
assert.ok(files.includes("sound.check.js"));
assert.ok(files.includes("find-game.check.js"));
assert.ok(files.length >= 15);
assert.ok(pyFiles.includes("serve-path.check.py"));

console.log("verify-checks.check.js OK");
