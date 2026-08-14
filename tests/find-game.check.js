import assert from "node:assert/strict";
import { createFindGame } from "../find-game.js";
import { createFindProgress } from "../find-progress.js";
import { heatHint } from "../orbit-look.js";

function memoryStorage() {
  const data = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
  };
}

function fakeClassList() {
  const s = new Set();
  return {
    add: (c) => s.add(c),
    remove: (c) => s.delete(c),
    contains: (c) => s.has(c),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
    _has: (c) => s.has(c),
  };
}

function fakeEl(extra = {}) {
  return { hidden: true, textContent: "", classList: fakeClassList(), style: {}, dataset: {}, ...extra };
}

const places = [
  { id: "a", name: "A", emoji: "🅰️", lat: 1, lng: 1, photos: [] },
  { id: "b", name: "B", emoji: "🅱️", lat: 2, lng: 2, photos: [] },
];
const els = {
  findPrompt: fakeEl(),
  findCue: fakeEl(),
  findEmoji: fakeEl(),
  findPhoto: Object.assign(fakeEl(), { src: "", alt: "", removeAttribute(n) { delete this[n]; } }),
  findAgain: fakeEl(),
  findStars: Object.assign(fakeEl(), { innerHTML: "" }),
  stickersBtn: fakeEl(),
  stickerCount: fakeEl(),
  stickerSheet: fakeEl(),
  stickerGrid: Object.assign(fakeEl(), { innerHTML: "" }),
  luna: Object.assign(fakeEl(), { dataset: { mood: "idle" } }),
  card: Object.assign(fakeEl(), { classList: fakeClassList() }),
};
const bodyClass = fakeClassList();
const origBody = globalThis.document;
globalThis.document = {
  body: { classList: bodyClass },
  querySelectorAll: () => [],
};

let tab = "landmarks";
const progress = createFindProgress({ storage: memoryStorage(), rand: () => 0 });
const game = createFindGame({
  els,
  getTab: () => tab,
  getPlaces: () => places,
  lookupPlace: (id) => places.find((p) => p.id === id) || null,
  getGlobe: () => null,
  card: { close() {} },
  progress,
  diveMs: () => 400,
  isDeepSpace: () => false,
  heatHint,
  playPop() {},
  playFanfare() {},
  playBoop() {},
  playFlyWhoosh() {},
  ensureAudio() {},
  speakName() {},
  setLunaMood() {},
  sparkBurst() {},
  shootingStar() {},
  flashFound() {},
  onOpenPlace() {},
});

assert.equal(game.isActive(), false);
game.start();
assert.equal(game.isActive(), true);
assert.equal(game.getTarget().id, "a"); // rand() => 0 picks first fresh
assert.equal(els.findPrompt.hidden, false);
assert.equal(game.handlePinTap("b").correct, false);
assert.equal(game.isActive(), true);
const hit = game.handlePinTap("a");
assert.equal(hit.correct, true);
assert.equal(hit.skipFly, true);
assert.equal(game.isActive(), false);

game.start();
game.stop();
assert.equal(game.isActive(), false);
assert.equal(els.findPrompt.hidden, true);

game.start();
game.handlePinTap(game.getTarget().id);
game.onCardClose();
assert.equal(game.isActive(), true); // resume after card

game.syncHeat({ lat: 1, lng: 1 });

const spacePlaces = [
  { id: "sun", kind: "star" },
  { id: "iss", kind: "station" },
  { id: "mars", kind: "planet" },
];
const spaceOpts = {
  els,
  getTab: () => "space",
  getPlaces: () => spacePlaces,
  lookupPlace: (id) => spacePlaces.find((p) => p.id === id) || null,
  getGlobe: () => null,
  card: { close() {} },
  progress: createFindProgress({ storage: memoryStorage(), rand: () => 0 }),
  diveMs: () => 400,
  isDeepSpace: () => false,
  heatHint,
  playPop() {},
  playFanfare() {},
  playBoop() {},
  playFlyWhoosh() {},
  ensureAudio() {},
  speakName() {},
  setLunaMood() {},
  sparkBurst() {},
  shootingStar() {},
  flashFound() {},
  onOpenPlace() {},
};
const spaceGame = createFindGame(spaceOpts);
spaceGame.start();
assert.ok(spaceGame.getTarget());
assert.notEqual(spaceGame.getTarget().id, "iss");

globalThis.document = origBody;
console.log("find-game.check.js OK");
