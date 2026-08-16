import assert from "node:assert/strict";
import { planetDisplayPx, createSpaceMode } from "../space-mode.js";
import { SPACE_HANDOFF_ALT } from "../orbit-look.js";
import { diameterKm } from "../space-catalog.js";

const EARTH = diameterKm("earth");
const MOON = diameterKm("moon");
const JUPITER = diameterKm("jupiter");
const SATURN = diameterKm("saturn");

assert.equal(planetDisplayPx(0, EARTH), 7);
assert.equal(planetDisplayPx(EARTH, EARTH), 26);
assert.ok(planetDisplayPx(MOON, EARTH) < planetDisplayPx(EARTH, EARTH));
assert.ok(planetDisplayPx(JUPITER, EARTH) > planetDisplayPx(SATURN, EARTH));
assert.ok(planetDisplayPx(JUPITER, EARTH) <= 96);
assert.ok(planetDisplayPx(SATURN, EARTH) < planetDisplayPx(JUPITER, EARTH));

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
let solarLoads = 0;
let solarWarms = 0;
let solarInits = 0;
const solarCalls = [];
const globeActive = [];
const handoff = [];
const globe = {
  setAutoRotate() {},
  setPlaces() {},
  setWeather() {},
  pointOfView() { return {}; },
  setActive(on) { globeActive.push(on); handoff.push(["globe", on]); },
  setNight() {},
};
const canvasMode = createSpaceMode({
  els: { ss3d, solarSystem: { hidden: true, classList: { add() {}, remove() {} } }, globeViz: { classList: { add() {}, remove() {} } }, globeShadow: { classList: { add() {}, remove() {} } } },
  getGlobe: () => globe,
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
  loadSolar3D: async () => {
    solarLoads += 1;
    return {
      init(_el, opts) {
        solarInits += 1;
        solarCalls.push(["init", opts && opts.startActive]);
      },
      warmTextures() { solarWarms += 1; },
      setActive(on) { solarCalls.push(["setActive", on]); handoff.push(["solar", on]); },
      resize() {},
      frameEarth() {},
      playIntroZoom() {},
    };
  },
});
await canvasMode.preload();
assert.equal(solarLoads, 1);
assert.equal(solarWarms, 1);
assert.equal(solarInits, 0);
assert.equal(solarCalls.length, 0);
assert.equal(ss3d.dataset.ready, undefined);
assert.equal(canvasSelected, 0);

await canvasMode.ensure();
assert.deepEqual(solarCalls, [["init", false]]);
await canvasMode.ensure();
assert.deepEqual(solarCalls, [["init", false]]);

const prevDoc2 = globalThis.document;
globalThis.document = { body: { classList: { add() {}, remove() {} } } };
try {
  canvasMode.enter();
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(solarCalls.filter((c) => c[0] === "setActive").slice(-1), [["setActive", true]]);
  assert.equal(globeActive.at(-1), false);
  const solarOnAt = solarCalls.findIndex((c) => c[0] === "setActive" && c[1] === true);
  assert.ok(solarOnAt >= 0);
  assert.deepEqual(handoff.slice(-2), [["solar", true], ["globe", false]]);

  await canvasMode.leave();
  const solarOffAt = solarCalls.findIndex((c, i) => i > solarOnAt && c[0] === "setActive" && c[1] === false);
  assert.ok(solarOffAt >= 0, "leave must pause solar immediately");
  assert.equal(globeActive.at(-1), true);
  assert.deepEqual(handoff.slice(-2), [["solar", false], ["globe", true]]);
} finally {
  globalThis.document = prevDoc2;
}

console.log("space-mode.check.js OK");
