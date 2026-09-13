/**
 * Bake static Luna MP3 clips for every place (card + name) and moon phases.
 * Usage: node scripts/bake-speech.mjs
 * Requires ffmpeg on PATH and npm install under scripts/ (not needed for --record-hashes-only).
 *
 * Skips a clip only when the MP3 exists and manifest.hashes[key] matches the
 * current source-text SHA-256. Copy edits therefore rebake automatically.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  VOICE,
  SPEED,
  PHASE_NAMES,
  QUIZ_CUES,
  cardText,
  nameText,
  languageClipId,
  languageText,
  clipKey,
  textHash,
  expectedClipSources,
} from "./speak-clip-hash.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clipsDir = join(root, "vendor/tts/clips");
const modelDir = join(root, "vendor/tts/model");
const manifestPath = join(clipsDir, "manifest.json");

function readManifest() {
  if (!existsSync(manifestPath)) {
    return { voice: VOICE, speed: SPEED, count: 0, ids: [], hashes: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
    return {
      voice: raw.voice || VOICE,
      speed: typeof raw.speed === "number" ? raw.speed : SPEED,
      count: raw.count || 0,
      ids: Array.isArray(raw.ids) ? raw.ids : [],
      hashes: raw.hashes && typeof raw.hashes === "object" ? { ...raw.hashes } : {},
    };
  } catch {
    return { voice: VOICE, speed: SPEED, count: 0, ids: [], hashes: {} };
  }
}

async function loadTts() {
  const ort = await import("onnxruntime-node");
  const { KittenTTS } = await import(
    pathToFileURL(join(root, "scripts/node_modules/kitten-tts-js/src/kitten-tts.js")).href
  );
  const { loadNpz } = await import(
    pathToFileURL(join(root, "scripts/node_modules/kitten-tts-js/src/npz-loader.js")).href
  );
  const config = JSON.parse(readFileSync(join(modelDir, "config.json"), "utf8"));
  const modelBuffer = readFileSync(join(modelDir, config.model_file));
  const voicesBuffer = readFileSync(join(modelDir, config.voices || "voices.npz"));
  const session = await ort.InferenceSession.create(modelBuffer);
  const voices = await loadNpz(
    voicesBuffer.buffer.slice(
      voicesBuffer.byteOffset,
      voicesBuffer.byteOffset + voicesBuffer.byteLength
    )
  );
  return new KittenTTS(session, voices, config);
}

function wavToMp3(wavPath, mp3Path) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-q:a", "5", mp3Path],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed for ${mp3Path}: ${r.stderr?.slice(-400)}`);
  }
}

/**
 * @param {object | null} tts
 * @param {string} id
 * @param {"card"|"name"} kind
 * @param {string} text
 * @param {Record<string, string>} hashes
 * @param {{ recordOnly?: boolean }} opts
 */
async function bakeOne(tts, id, kind, text, hashes, opts = {}) {
  const key = clipKey(id, kind);
  const mp3 = join(clipsDir, `${id}.${kind}.mp3`);
  const want = textHash(text);
  const have = hashes[key];
  if (existsSync(mp3) && have === want) {
    console.log(`skip ${key}`);
    return { baked: false, recorded: false };
  }
  if (opts.recordOnly && existsSync(mp3)) {
    hashes[key] = want;
    console.log(`record ${key}`);
    return { baked: false, recorded: true };
  }
  if (!tts) {
    throw new Error(`need TTS to bake ${key} (missing or stale hash)`);
  }
  console.log(`bake ${key} (${text.length} chars)`);
  const audio = await tts.generate(text, { voice: VOICE, speed: SPEED });
  const wav = join(clipsDir, `${id}.${kind}.wav`);
  await audio.save(wav);
  wavToMp3(wav, mp3);
  try {
    unlinkSync(wav);
  } catch {
    /* ignore */
  }
  hashes[key] = want;
  return { baked: true, recorded: false };
}

mkdirSync(clipsDir, { recursive: true });

const recordOnly = process.argv.includes("--record-hashes-only");
const { allPlaces } = await import(pathToFileURL(join(root, "place.js")).href);
const places = allPlaces();

const byId = new Map();
for (const p of places) {
  if (!p?.id || !p?.name) continue;
  byId.set(p.id, p);
}
console.log(`places: ${byId.size}${recordOnly ? " (record-hashes-only)" : ""}`);

const manifest = readManifest();
const hashes = manifest.hashes;
const sources = expectedClipSources([...byId.values()]);

let needTts = false;
if (!recordOnly) {
  for (const [key, text] of sources) {
    const [id, kind] = key.split(/\.(?=[^.]+$)/);
    const mp3 = join(clipsDir, `${id}.${kind}.mp3`);
    if (!existsSync(mp3) || hashes[key] !== textHash(text)) {
      needTts = true;
      break;
    }
  }
}

const tts = needTts ? await loadTts() : null;

let baked = 0;
let recorded = 0;
let skipped = 0;

for (const p of byId.values()) {
  for (const [kind, text] of [
    ["card", cardText(p)],
    ["name", nameText(p)],
  ]) {
    const r = await bakeOne(tts, p.id, kind, text, hashes, { recordOnly });
    if (r.baked) baked += 1;
    else if (r.recorded) recorded += 1;
    else skipped += 1;
  }
}

for (const [id, text] of PHASE_NAMES) {
  const r = await bakeOne(tts, `phase-${id}`, "name", text, hashes, { recordOnly });
  if (r.baked) baked += 1;
  else if (r.recorded) recorded += 1;
  else skipped += 1;
}

for (const [id, text] of QUIZ_CUES) {
  const r = await bakeOne(tts, id, "name", text, hashes, { recordOnly });
  if (r.baked) baked += 1;
  else if (r.recorded) recorded += 1;
  else skipped += 1;
}

const languages = new Set();
for (const p of byId.values()) {
  if (p.language) languages.add(String(p.language).trim());
}
for (const lang of [...languages].sort()) {
  const id = languageClipId(lang);
  if (!id) continue;
  const r = await bakeOne(tts, id, "name", languageText(lang), hashes, { recordOnly });
  if (r.baked) baked += 1;
  else if (r.recorded) recorded += 1;
  else skipped += 1;
}

const expectedKeys = new Set(sources.keys());
for (const key of Object.keys(hashes)) {
  if (!expectedKeys.has(key)) delete hashes[key];
}

writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      voice: VOICE,
      speed: SPEED,
      count: byId.size,
      ids: [...byId.keys()].sort(),
      hashes,
    },
    null,
    2
  ) + "\n"
);
console.log(`done (baked=${baked} recorded=${recorded} skipped=${skipped})`);
