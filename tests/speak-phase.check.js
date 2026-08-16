import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_ORDER } from "../moon-phases.js";
import { speakPhase } from "../speak.js";

assert.equal(typeof speakPhase, "function");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const id of PHASE_ORDER) {
  const mp3 = join(root, "vendor/tts/clips", `phase-${id}.name.mp3`);
  assert.equal(existsSync(mp3), true, `missing ${mp3}`);
}

console.log("speak-phase.check.js OK");
