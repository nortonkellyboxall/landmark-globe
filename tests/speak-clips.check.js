import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPlaces } from "../place.js";
import {
  expectedClipSources,
  textHash,
} from "../scripts/speak-clip-hash.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clipsDir = join(root, "vendor/tts/clips");
const manifestPath = join(clipsDir, "manifest.json");

assert.equal(existsSync(manifestPath), true, `missing ${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(typeof manifest.hashes, "object", "manifest.hashes required");
assert.notEqual(manifest.hashes, null);

const places = allPlaces().filter((p) => p?.id && p?.name);
const sources = expectedClipSources(places);

assert.equal(manifest.count, places.length, "manifest.count must match allPlaces()");
assert.deepEqual(
  [...(manifest.ids || [])].sort(),
  [...places.map((p) => p.id)].sort(),
  "manifest.ids must match allPlaces() ids"
);

for (const [key, text] of sources) {
  const [id, kind] = key.split(/\.(?=[^.]+$)/);
  const mp3 = join(clipsDir, `${id}.${kind}.mp3`);
  assert.equal(existsSync(mp3), true, `missing ${mp3}`);
  const want = textHash(text);
  assert.equal(
    manifest.hashes[key],
    want,
    `stale or missing hash for ${key} — run: node scripts/bake-speech.mjs`
  );
}

for (const key of Object.keys(manifest.hashes)) {
  assert.equal(sources.has(key), true, `unexpected manifest hash key ${key}`);
}

console.log("speak-clips.check.js OK");
