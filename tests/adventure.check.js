import assert from "node:assert/strict";
import { placesForContinent, createAdventure } from "../adventure.js";

const landmarks = [
  { id: "ny", continent: "Americas", lat: 40 },
  { id: "lima", continent: "Americas", lat: -12 },
  { id: "paris", continent: "Europe", lat: 48 },
];
const wonders = [
  { id: "grandcanyon", continent: "Americas", lat: 36 },
  { id: "patagonia", continent: "Americas", lat: -50 },
  { id: "alps", continent: "Europe", lat: 46 },
];

assert.deepEqual(
  placesForContinent("northamerica", landmarks, wonders).map((p) => p.id),
  ["ny", "grandcanyon"]
);
assert.deepEqual(
  placesForContinent("southamerica", landmarks, wonders).map((p) => p.id),
  ["lima", "patagonia"]
);
assert.deepEqual(
  placesForContinent("europe", landmarks, wonders).map((p) => p.id),
  ["paris", "alps"]
);
assert.deepEqual(placesForContinent("nope", landmarks, wonders), []);

function fakeClassList() {
  const s = new Set();
  return {
    add: (c) => s.add(c),
    remove: (c) => s.delete(c),
    contains: (c) => s.has(c),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
  };
}
function fakeEl() {
  return { hidden: true, textContent: "", classList: fakeClassList(), setAttribute() {}, innerHTML: "" };
}

const datasets = {
  landmarks: { items: [{ id: "eiffel", lat: 1, lng: 1 }], label: "L", hint: "", main: "landmarks" },
  wonders: { items: [{ id: "fuji", lat: 2, lng: 2 }], label: "W", hint: "", main: "wonders" },
  continents: { items: [], label: "C", hint: "", main: "continents" },
  countries: { items: [], label: "K", hint: "", main: "countries" },
  space: { items: [{ id: "mars", kind: "planet" }], label: "S", hint: "", main: "space" },
};
let stopped = 0;
const adventure = createAdventure({
  datasets,
  els: {
    tabLandmarks: fakeEl(),
    tabWonders: fakeEl(),
    tabContinents: fakeEl(),
    tabCountries: fakeEl(),
    tabSpace: fakeEl(),
    exploreLabel: fakeEl(),
    brandHint: fakeEl(),
    settingsPanel: fakeEl(),
    settingsBtn: fakeEl(),
    strip: null,
  },
  getGlobe: () => null,
  card: { close() {} },
  stopFind: () => { stopped += 1; },
  spaceEnter() {},
  spaceLeave() { return Promise.resolve(); },
  diveMs: () => 400,
  setAmbient() {},
  playPop() {},
  setPanelOpen() {},
  onOpenPlace() {},
  hideStickers() {},
});

assert.equal(adventure.getTab(), "landmarks");
adventure.switchTab("wonders");
assert.equal(adventure.getTab(), "wonders");
assert.equal(adventure.getPlaces()[0].id, "fuji");
assert.ok(stopped >= 1);
const before = adventure.getTab();
adventure.switchTab("nope");
assert.equal(adventure.getTab(), before);

console.log("adventure.check.js OK");
