import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_ORDER,
  createMoonPhaseToy,
  earthViewFace,
  phaseFromTurn,
} from "../moon-phases.js";

const MIDPOINTS = [
  [0.03125, "new"],
  [0.125, "waxing-crescent"],
  [0.25, "first-quarter"],
  [0.375, "waxing-gibbous"],
  [0.5, "full"],
  [0.625, "waning-gibbous"],
  [0.75, "last-quarter"],
  [0.875, "waning-crescent"],
];

test("PHASE_ORDER has eight phase ids", () => {
  assert.equal(PHASE_ORDER.length, 8);
});

test("midpoints of each band map to the correct id", () => {
  for (const [t, id] of MIDPOINTS) {
    assert.equal(phaseFromTurn(t).id, id, `t=${t}`);
  }
});

test("t=0.5 is full with litFraction ≈ 1 and moonAngle ≈ π", () => {
  const p = phaseFromTurn(0.5);
  assert.equal(p.id, "full");
  assert.ok(Math.abs(p.litFraction - 1) < 1e-9);
  assert.ok(Math.abs(p.moonAngle - Math.PI) < 1e-9);
});

test("t=0 is new with litFraction ≈ 0", () => {
  const p = phaseFromTurn(0);
  assert.equal(p.id, "new");
  assert.ok(Math.abs(p.litFraction) < 1e-9);
});

test("wrap: t=1.5 matches 0.5; negatives land in late-cycle bands", () => {
  const a = phaseFromTurn(1.5);
  const b = phaseFromTurn(0.5);
  assert.equal(a.id, b.id);
  assert.ok(Math.abs(a.litFraction - b.litFraction) < 1e-9);
  assert.ok(Math.abs(a.moonAngle - b.moonAngle) < 1e-9);
  // -0.25 → 0.75 → last-quarter; -0.125 → 0.875 → waning-crescent
  assert.equal(phaseFromTurn(-0.25).id, "last-quarter");
  assert.equal(phaseFromTurn(-0.125).id, "waning-crescent");
});

test("boundaries: 0.0625 → waxing-crescent; 0.9375 → new", () => {
  assert.equal(phaseFromTurn(0.0625).id, "waxing-crescent");
  assert.equal(phaseFromTurn(0.9375).id, "new");
});

test("createMoonPhaseToy is a function", () => {
  assert.equal(typeof createMoonPhaseToy, "function");
});

test("phaseFromTurn exposes name and blurb", () => {
  const p = phaseFromTurn(0.5);
  assert.equal(p.name, "Full Moon");
  assert.ok(p.blurb && p.blurb.length > 0);
});

test("earthViewFace matches northern-hemisphere sky (right lit waxing)", () => {
  assert.equal(earthViewFace(0).litSide, "none");
  assert.equal(earthViewFace(0).shadowWidth, 100);
  assert.equal(earthViewFace(0.25).litSide, "right");
  assert.equal(earthViewFace(0.25).shadowX, 0);
  assert.equal(earthViewFace(0.5).litSide, "full");
  assert.equal(earthViewFace(0.75).litSide, "left");
  assert.equal(earthViewFace(0.75).shadowX, 50);
});
