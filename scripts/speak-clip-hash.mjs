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

export function cardText(p) {
  return [`${p.name}.`, p.place, p.story, p.wow ? `Wow fact. ${p.wow}` : ""]
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function nameText(p) {
  return `${p.name}.`;
}

export function clipKey(id, kind) {
  return `${id}.${kind}`;
}

export function textHash(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

/** Expected clip keys + source text for every Place and moon phase name. */
export function expectedClipSources(places) {
  /** @type {Map<string, string>} */
  const out = new Map();
  for (const p of places) {
    if (!p?.id || !p?.name) continue;
    out.set(clipKey(p.id, "card"), cardText(p));
    out.set(clipKey(p.id, "name"), nameText(p));
  }
  for (const [id, text] of PHASE_NAMES) {
    out.set(clipKey(`phase-${id}`, "name"), text);
  }
  return out;
}
