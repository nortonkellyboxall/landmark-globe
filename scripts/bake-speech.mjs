/**
 * Bake static Luna Opus clips for every place (card + name).
 * Usage: node scripts/bake-speech.mjs
 * Requires ffmpeg on PATH.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ort from "onnxruntime-node";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clipsDir = join(root, "vendor/tts/clips");
const modelDir = join(root, "vendor/tts/model");
const VOICE = "Luna";
const SPEED = 0.95;

const { KittenTTS } = await import(
  pathToFileURL(join(root, "scripts/node_modules/kitten-tts-js/src/kitten-tts.js")).href
);
const { loadNpz } = await import(
  pathToFileURL(join(root, "scripts/node_modules/kitten-tts-js/src/npz-loader.js")).href
);

function loadWindowArray(file, ident) {
  const code = readFileSync(join(root, file), "utf8");
  const window = {};
  // Content packs assign window.X = [...]
  Function("window", code)(window);
  return window[ident] || [];
}

async function loadSpaceBodies() {
  const mod = await import(pathToFileURL(join(root, "space-catalog.js")).href);
  return mod.SPACE_BODIES || [];
}

function cardText(p) {
  return [`${p.name}.`, p.place, p.story, p.wow ? `Wow fact. ${p.wow}` : ""]
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .join(" ");
}

function nameText(p) {
  return `${p.name}.`;
}

async function loadTts() {
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

async function bakeOne(tts, id, kind, text) {
  const mp3 = join(clipsDir, `${id}.${kind}.mp3`);
  if (existsSync(mp3)) {
    console.log(`skip ${id}.${kind}`);
    return;
  }
  console.log(`bake ${id}.${kind} (${text.length} chars)`);
  const audio = await tts.generate(text, { voice: VOICE, speed: SPEED });
  const wav = join(clipsDir, `${id}.${kind}.wav`);
  await audio.save(wav);
  wavToMp3(wav, mp3);
  try {
    require("fs").unlinkSync(wav);
  } catch {
    /* ignore */
  }
}

mkdirSync(clipsDir, { recursive: true });

const places = [
  ...loadWindowArray("landmarks.js", "LANDMARKS"),
  ...loadWindowArray("wonders.js", "WONDERS"),
  ...loadWindowArray("geography.js", "CONTINENTS"),
  ...loadWindowArray("geography.js", "COUNTRIES"),
  ...(await loadSpaceBodies()),
];

const byId = new Map();
for (const p of places) {
  if (!p?.id || !p?.name) continue;
  byId.set(p.id, p);
}
console.log(`places: ${byId.size}`);

const tts = await loadTts();
for (const p of byId.values()) {
  await bakeOne(tts, p.id, "card", cardText(p));
  await bakeOne(tts, p.id, "name", nameText(p));
}

writeFileSync(
  join(clipsDir, "manifest.json"),
  JSON.stringify(
    {
      voice: VOICE,
      speed: SPEED,
      count: byId.size,
      ids: [...byId.keys()].sort(),
    },
    null,
    2
  )
);
console.log("done");
