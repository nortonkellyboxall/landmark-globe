import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPlaces } from "../place.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of allPlaces()) {
  if (!p?.id) continue;
  for (const kind of ["name", "card"]) {
    const mp3 = join(root, "vendor/tts/clips", `${p.id}.${kind}.mp3`);
    assert.equal(existsSync(mp3), true, `missing ${mp3}`);
  }
}

assert.equal(existsSync(join(root, "vendor/tts/clips", "iss.name.mp3")), true);
assert.equal(existsSync(join(root, "vendor/tts/clips", "iss.card.mp3")), true);

console.log("speak-clips.check.js OK");
