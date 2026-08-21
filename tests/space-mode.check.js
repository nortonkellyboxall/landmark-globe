import assert from "node:assert/strict";
import { planetDisplayPx, createSpaceMode } from "../space-mode.js";
import { SPACE_HANDOFF_ALT, SPACE_RETURN_ALT } from "../orbit-look.js";
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
  els: { ssSizesRow: null, ssSizesPanel: null, ss3d: null, solarSystem: { hidden: true, classList: { add() {}, remove() {} } }, globeViz: { dataset: {}, classList: { add() {}, remove() {} } }, globeShadow: { classList: { add() {}, remove() {} } }, nightBtn: { style: {} }, autoNightBtn: { style: {} }, sunBtn: { hidden: false } },
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
  loadSolar3D: async () => ({
    init() {},
    warmTextures() {},
    resize() {},
    isReady() { return false; },
    setViewMode() { return Promise.resolve("solar"); },
  }),
});

assert.equal(mode.isTransitioning(), false);
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);
mode.armPinch();
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), true);
flags.tab = "space";
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);

assert.equal(mode.shouldReturn(SPACE_RETURN_ALT - 0.2), false, "no return until visited deep space");
assert.equal(mode.shouldReturn(SPACE_HANDOFF_ALT + 0.2), false, "still deep — marks visit but no return");
assert.equal(mode.shouldReturn(SPACE_RETURN_ALT - 0.2), true, "zoom back after deep visit");

assert.equal(typeof mode.enter, "function");
assert.equal(typeof mode.leave, "function");
assert.equal(typeof mode.buildSizes, "function");
assert.equal(typeof mode.setSizesOpen, "function");
assert.equal(typeof mode.toggleSizes, "function");
assert.equal(typeof mode.highlight, "function");
assert.equal(typeof mode.ensure, "function");
assert.equal(typeof mode.preload, "function");
assert.equal(typeof mode.resize, "function");
assert.equal(typeof mode.setOrbitMode, "function");
assert.equal(typeof mode.toggleOrbitMode, "function");

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

const globeViz = { dataset: {}, classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
let canvasSelected = 0;
let solarLoads = 0;
let solarWarms = 0;
let solarInits = 0;
const solarCalls = [];
const globeActive = [];
const globe = {
  setAutoRotate() {},
  setPlaces() {},
  setWeather() {},
  pointOfView() { return { lat: 18, lng: -18, altitude: 2.4 }; },
  setActive(on) { globeActive.push(on); },
  setNight() {},
};
const whooshes = { n: 0 };
const canvasMode = createSpaceMode({
  els: {
    globeViz,
    ss3d: null,
    solarSystem: { hidden: true, classList: { add() {}, remove() {} } },
    globeShadow: { classList: { add() {}, remove() {} } },
    nightBtn: { style: {} },
    autoNightBtn: { style: {} },
    sunBtn: { hidden: false },
  },
  getGlobe: () => globe,
  getTab: () => "landmarks",
  getNightMode: () => false,
  getSpaceItems: () => [],
  spaceDiameterKm: () => 1,
  diveMs: () => 400,
  playFlyWhoosh() { whooshes.n += 1; },
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
        solarCalls.push(["init", opts && opts.viewMode]);
      },
      isReady() { return solarInits > 0; },
      warmTextures() { solarWarms += 1; },
      setActive(on) { solarCalls.push(["setActive", on]); },
      setViewMode(mode, opts) {
        solarCalls.push([
          "setViewMode",
          mode,
          !!(opts && opts.fluid),
          !!(opts && opts.animate),
        ]);
        return Promise.resolve(mode);
      },
      resize() {},
      frameEarth() {},
      playIntroZoom() { solarCalls.push(["playIntroZoom"]); return Promise.resolve(); },
      zoomToEarth() { solarCalls.push(["zoomToEarth"]); return Promise.resolve(); },
    };
  },
});
await canvasMode.preload();
assert.equal(solarLoads, 1);
assert.equal(solarWarms, 1);
assert.equal(solarInits, 0);
assert.equal(solarCalls.length, 0);
assert.equal(globeViz.dataset.ready, undefined);
assert.equal(canvasSelected, 0);

await canvasMode.ensure();
assert.deepEqual(solarCalls, [["init", "earth"]]);
await canvasMode.ensure();
assert.deepEqual(solarCalls, [["init", "earth"]]);

const prevDoc2 = globalThis.document;
globalThis.document = { body: { classList: { add() {}, remove() {} } } };
try {
  whooshes.n = 0;
  canvasMode.enter({ fluid: true });
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(whooshes.n, 0, "fluid pinch enter is quiet");
  assert.ok(solarCalls.some((c) => c[0] === "setViewMode" && c[1] === "solar" && c[2] === true));
  assert.equal(globeActive.length, 0, "shared world never pauses via setActive");
  assert.ok(!solarCalls.some((c) => c[0] === "setActive"));
  assert.ok(!solarCalls.some((c) => c[0] === "playIntroZoom"));

  await canvasMode.leave({ quiet: true });
  assert.equal(whooshes.n, 0, "quiet leave stays quiet");
  assert.ok(solarCalls.some((c) => c[0] === "setViewMode" && c[1] === "earth" && c[2] === true));
  assert.equal(globeActive.length, 0);

  await new Promise((r) => setTimeout(r, 450));
  solarCalls.length = 0;
  canvasMode.enter({ overview: true });
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(whooshes.n, 1, "tab overview whooshes");
  assert.ok(
    solarCalls.some((c) => c[0] === "setViewMode" && c[1] === "solar" && c[2] === false),
    "overview is not fluid"
  );
} finally {
  globalThis.document = prevDoc2;
}

console.log("space-mode.check.js OK");
