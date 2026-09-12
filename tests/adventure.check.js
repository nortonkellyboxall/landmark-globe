import assert from "node:assert/strict";
import { LANDMARKS } from "../landmarks.js";
import {
  placesForContinent,
  continentIdForExplore,
  continentPlaceForExplore,
  createAdventure,
  DATASETS,
} from "../adventure.js";

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
const countries = [
  { id: "usa", continent: "northamerica", lat: 39 },
  { id: "brazil", continent: "southamerica", lat: -14 },
  { id: "france", continent: "europe", lat: 46 },
  { id: "egypt", continent: "africa", lat: 26 },
];

assert.deepEqual(
  placesForContinent("northamerica", landmarks, wonders, countries).map((p) => p.id),
  ["ny", "grandcanyon", "usa"]
);
assert.deepEqual(
  placesForContinent("southamerica", landmarks, wonders, countries).map((p) => p.id),
  ["lima", "patagonia", "brazil"]
);
assert.deepEqual(
  placesForContinent("europe", landmarks, wonders, countries).map((p) => p.id),
  ["paris", "alps", "france"]
);
assert.deepEqual(
  placesForContinent("africa", landmarks, wonders, countries).map((p) => p.id),
  ["egypt"]
);
assert.deepEqual(placesForContinent("nope", landmarks, wonders, countries), []);
assert.deepEqual(
  placesForContinent("europe", landmarks, wonders).map((p) => p.id),
  ["paris", "alps"],
  "countries arg optional"
);

assert.equal(continentIdForExplore({ kind: "continent", id: "europe" }), "europe");
assert.equal(
  continentIdForExplore({ kind: "country", id: "france", continent: "europe" }),
  "europe"
);
assert.equal(continentIdForExplore({ kind: "landmark", id: "eiffel" }), null);
assert.equal(continentIdForExplore(null), null);

const europeCard = { id: "europe", name: "Europe", kind: "continent" };
assert.equal(continentPlaceForExplore(europeCard), europeCard);
assert.equal(
  continentPlaceForExplore(
    { kind: "country", id: "france", continent: "europe" },
    [{ id: "europe", name: "Europe", kind: "continent" }]
  ).id,
  "europe"
);
assert.ok(
  placesForContinent(
    continentIdForExplore({ kind: "country", id: "france", continent: "europe" }),
    landmarks,
    wonders,
    countries
  ).some((p) => p.id === "paris"),
  "country Explore joins europe pool"
);
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
const enters = [];
const leaves = [];
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
  spaceEnter(o) { enters.push(o || {}); },
  spaceLeave(o) { leaves.push(o || {}); return Promise.resolve(); },
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

adventure.switchTab("space", { overview: true });
assert.equal(adventure.getTab(), "space");
assert.deepEqual(enters.at(-1), { fluid: false, overview: true });

adventure.switchTab("landmarks", { quiet: true });
assert.equal(adventure.getTab(), "landmarks");
assert.deepEqual(leaves.at(-1), { quiet: true });

adventure.switchTab("space", { fluid: true });
assert.deepEqual(enters.at(-1), { fluid: true, overview: false });

assert.equal(DATASETS.landmarks.items, LANDMARKS);
assert.equal(DATASETS.space.main, "space");

console.log("adventure.check.js OK");
