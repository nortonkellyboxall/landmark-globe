/** Moon phases toy — pure math (DOM factory added in a later task). */

export const PHASE_ORDER = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

const LABELS = {
  new: "New Moon",
  "waxing-crescent": "Waxing Crescent",
  "first-quarter": "First Quarter",
  "waxing-gibbous": "Waxing Gibbous",
  full: "Full Moon",
  "waning-gibbous": "Waning Gibbous",
  "last-quarter": "Last Quarter",
  "waning-crescent": "Waning Crescent",
};

/** Half-open bands; `new` wraps across 0. Spec: docs/superpowers/specs/2026-08-17-moon-phases-design.md */
const BANDS = [
  { id: "new", start: 0.9375, end: 1 },
  { id: "new", start: 0, end: 0.0625 },
  { id: "waxing-crescent", start: 0.0625, end: 0.1875 },
  { id: "first-quarter", start: 0.1875, end: 0.3125 },
  { id: "waxing-gibbous", start: 0.3125, end: 0.4375 },
  { id: "full", start: 0.4375, end: 0.5625 },
  { id: "waning-gibbous", start: 0.5625, end: 0.6875 },
  { id: "last-quarter", start: 0.6875, end: 0.8125 },
  { id: "waning-crescent", start: 0.8125, end: 0.9375 },
];

function wrapTurn(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return ((n % 1) + 1) % 1;
}

function phaseIdForTurn(t) {
  for (const b of BANDS) {
    if (t >= b.start && t < b.end) return b.id;
  }
  return "new";
}

/**
 * @param {number} t orbit turn
 * @returns {{ id: string, label: string, litFraction: number, moonAngle: number }}
 */
export function phaseFromTurn(t) {
  const u = wrapTurn(t);
  const id = phaseIdForTurn(u);
  return {
    id,
    label: LABELS[id],
    litFraction: 0.5 - 0.5 * Math.cos(2 * Math.PI * u),
    moonAngle: 2 * Math.PI * u,
  };
}

/** Stub — implemented in a later task. */
export function createMoonPhaseToy() {
  throw new Error("createMoonPhaseToy: not implemented");
}
