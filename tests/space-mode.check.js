import assert from "node:assert/strict";
import { planetDisplayPx, createSpaceMode } from "../space-mode.js";
import { SPACE_HANDOFF_ALT } from "../orbit-look.js";

assert.equal(planetDisplayPx(0, 140000, 54), 8);
assert.ok(planetDisplayPx(140000, 140000, 54) >= 50);

const flags = { transitioning: false, pinchArmed: false, tab: "landmarks" };
const mode = createSpaceMode({
  els: { ssSizesRow: null, ssSizesPanel: null, ss3d: null, solarSystem: { hidden: true, classList: { add() {}, remove() {} } }, globeViz: { classList: { add() {}, remove() {} } }, globeShadow: { classList: { add() {}, remove() {} } }, nightBtn: { style: {} }, autoNightBtn: { style: {} }, sunBtn: { hidden: false } },
  getGlobe: () => null,
  getTab: () => flags.tab,
  getNightMode: () => false,
  getSpaceItems: () => [],
  spaceDiameterKm: () => 1,
  diveMs: () => 400,
  playFlyWhoosh() {},
  setAmbient() {},
  sparkAt() {},
  onSelect() {},
  matchReduce: () => true,
});

assert.equal(mode.isTransitioning(), false);
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);
mode.armPinch();
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), true);
flags.tab = "space";
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);

console.log("space-mode.check.js OK");
