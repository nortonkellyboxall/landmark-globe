/**
 * Shared Luna clip source text + SHA-256 keys for bake and freshness checks.
 * Node-only (uses node:crypto). Browser speak.js stays playback-only.
 */
import { createHash } from "node:crypto";

export const VOICE = "Luna";
export const SPEED = 0.95;

export const PHASE_NAMES = [
  ["new", "New Moon."],
  ["waxing-crescent", "Waxing Crescent."],
  ["first-quarter", "First Quarter."],
  ["waxing-gibbous", "Waxing Gibbous."],
  ["full", "Full Moon."],
  ["waning-gibbous", "Waning Gibbous."],
  ["last-quarter", "Last Quarter."],
  ["waning-crescent", "Waning Crescent."],
];

/** Static Choice-quiz cues + coach lines (pre-baked Luna MP3s). */
export const QUIZ_CUES = [
  ["quiz-where-is", "Where is this?"],
  ["quiz-flag-country", "What country does this flag show?"],
  ["quiz-language", "What language do they speak here?"],
  ["quiz-which-in", "Which one is in"],
  ["quiz-which-continent", "Which continent is this on?"],
  ["quiz-kind-landmark", "Which one is a landmark?"],
  ["quiz-kind-wonder", "Which one is a natural wonder?"],
  ["quiz-kind-country", "Which one is a country?"],
  ["quiz-kind-continent", "Which one is a continent?"],
  ["quiz-kind-star", "Which one is a star?"],
  ["quiz-kind-planet", "Which one is a planet?"],
  ["quiz-kind-moon", "Which one is a moon?"],
  ["quiz-almost", "Almost. Try again!"],
  ["quiz-yes", "Yes!"],
];

export function cardText(p) {
  return [`${p.name}.`, p.place, p.story, p.wow ? `Wow fact. ${p.wow}` : ""]
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function nameText(p) {
  return `${p.name}.`;
}

/** Stable clip id for a spoken language answer label. */
export function languageClipId(language) {
  const slug = String(language || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `lang-${slug}` : "";
}

export function languageText(language) {
  return `${String(language || "").trim()}.`;
}

export function clipKey(id, kind) {
  return `${id}.${kind}`;
}

export function textHash(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

/**
 * Expected clip keys + source text for every Place, moon phase, quiz cue,
 * and country-language answer label.
 */
export function expectedClipSources(places) {
  /** @type {Map<string, string>} */
  const out = new Map();
  const languages = new Set();
  for (const p of places) {
    if (!p?.id || !p?.name) continue;
    out.set(clipKey(p.id, "card"), cardText(p));
    out.set(clipKey(p.id, "name"), nameText(p));
    if (p.language) languages.add(String(p.language).trim());
  }
  for (const [id, text] of PHASE_NAMES) {
    out.set(clipKey(`phase-${id}`, "name"), text);
  }
  for (const [id, text] of QUIZ_CUES) {
    out.set(clipKey(id, "name"), text);
  }
  for (const lang of [...languages].sort()) {
    const id = languageClipId(lang);
    if (!id) continue;
    out.set(clipKey(id, "name"), languageText(lang));
  }
  return out;
}
