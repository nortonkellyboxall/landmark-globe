import assert from "node:assert/strict";
import { planetDisplayPx, createSpaceMode } from "../space-mode.js";
import { SPACE_HANDOFF_ALT } from "../orbit-look.js";

assert.equal(planetDisplayPx(0, 140000, 54), 8);
assert.ok(planetDisplayPx(140000, 140000, 54) >= 50);

const flags = { transitioning: false, pinchArmed: false, tab: "landmarks" };
let stopped = 0;
let selected = 0;
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
  onSelect() { selected += 1; },
  stopFind() { stopped += 1; },
  matchReduce: () => true,
});

assert.equal(mode.isTransitioning(), false);
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);
mode.armPinch();
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), true);
flags.tab = "space";
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);

assert.equal(typeof mode.enter, "function");
assert.equal(typeof mode.leave, "function");
assert.equal(typeof mode.buildSizes, "function");
assert.equal(typeof mode.setSizesOpen, "function");
assert.equal(typeof mode.toggleSizes, "function");
assert.equal(typeof mode.highlight, "function");
assert.equal(typeof mode.ensure, "function");
assert.equal(typeof mode.preload, "function");
assert.equal(typeof mode.resize, "function");

mode.buildSizes();
mode.setSizesOpen(true);
mode.toggleSizes();
mode.highlight("earth");
mode.resize();

const prevDoc = globalThis.document;
globalThis.document = { body: { classList: { add() {}, remove() {} } } };
try {
  mode.enter();
  assert.equal(stopped, 1);
  assert.equal(mode.isTransitioning(), true);
  assert.equal(mode.isPinchArmed(), false);
} finally {
  globalThis.document = prevDoc;
}

await mode.preload();
assert.equal(selected, 0);

const ss3d = { dataset: {} };
let canvasSelected = 0;
const canvasMode = createSpaceMode({
  els: { ss3d, solarSystem: { hidden: true, classList: { add() {}, remove() {} } }, globeViz: { classList: { add() {}, remove() {} } } },
  getGlobe: () => null,
  getTab: () => "landmarks",
  getNightMode: () => false,
  getSpaceItems: () => [],
  spaceDiameterKm: () => 1,
  diveMs: () => 400,
  playFlyWhoosh() {},
  setAmbient() {},
  sparkAt() {},
  onSelect() { canvasSelected += 1; },
  stopFind() {},
  matchReduce: () => true,
});
await canvasMode.preload();
assert.equal(ss3d.dataset.ready, undefined);
assert.equal(canvasSelected, 0);

console.log("space-mode.check.js OK");
