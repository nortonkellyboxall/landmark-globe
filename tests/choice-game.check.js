import assert from "node:assert/strict";
import { createChoiceGame } from "../choice-game.js";
import { CONTINENTS } from "../geography.js";

function fakeClassList() {
  const s = new Set();
  return {
    add: (c) => s.add(c),
    remove: (c) => s.delete(c),
    contains: (c) => s.has(c),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
  };
}

function fakeEl(extra = {}) {
  return {
    hidden: true,
    textContent: "",
    innerHTML: "",
    classList: fakeClassList(),
    style: {},
    dataset: {},
    appendChild(child) {
      this._kids = this._kids || [];
      this._kids.push(child);
    },
    querySelector(sel) {
      const kids = this._kids || [];
      const m = /\[data-id="([^"]+)"\]/.exec(sel);
      if (!m) return null;
      return kids.find((k) => k.dataset && k.dataset.id === m[1]) || null;
    },
    removeAttribute(n) {
      delete this[n];
    },
    ...extra,
  };
}

const earth = [
  { id: "eiffel", name: "Eiffel Tower", emoji: "🗼", continent: "Europe", lat: 48, lng: 2, photos: ["e.jpg"] },
  { id: "pyramids", name: "Pyramids", emoji: "🔺", continent: "Africa", lat: 29, lng: 31, photos: [] },
  { id: "wall", name: "Great Wall", emoji: "🧱", continent: "Asia", lat: 40, lng: 116, photos: [] },
  { id: "france", name: "France", emoji: "🇫🇷", kind: "country", continent: "europe", lat: 46, lng: 2 },
  { id: "egypt", name: "Egypt", emoji: "🇪🇬", kind: "country", continent: "africa", lat: 26, lng: 30 },
  ...CONTINENTS,
];

const els = {
  choicePrompt: fakeEl(),
  choiceCue: fakeEl(),
  choiceScore: fakeEl(),
  choiceEmoji: fakeEl(),
  choicePhoto: Object.assign(fakeEl(), { src: "", alt: "" }),
  choiceOptions: fakeEl(),
  choiceNext: fakeEl(),
  luna: Object.assign(fakeEl(), { dataset: { mood: "idle" }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }),
  card: Object.assign(fakeEl(), { classList: fakeClassList() }),
};

const bodyClass = fakeClassList();
globalThis.document = {
  body: { classList: bodyClass },
  createElement(tag) {
    return fakeEl({
      tagName: tag.toUpperCase(),
      type: "",
      dataset: {},
      disabled: false,
      setAttribute(name, value) {
        this[name] = value;
        if (name === "aria-label") this.ariaLabel = value;
      },
      addEventListener() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }),
    });
  },
};

let findStopped = 0;
const moods = [];
const game = createChoiceGame({
  els,
  getTab: () => "landmarks",
  getEarthPlaces: () => earth,
  getSpacePlaces: () => [],
  getContinents: () => CONTINENTS,
  card: { close() {} },
  stopFind: () => {
    findStopped += 1;
  },
  playPop() {},
  playFanfare() {},
  playBoop() {},
  ensureAudio() {},
  speakName() {},
  setLunaMood(mood) {
    moods.push(mood);
  },
  sparkBurst() {},
  flashFound() {},
});

game.start();
assert.equal(findStopped, 1);
assert.equal(els.choicePrompt.hidden, false);
assert.ok(bodyClass.contains("choice-mode"));
assert.ok(els.choiceOptions._kids && els.choiceOptions._kids.length >= 3);

const q = game.getQuestion();
assert.ok(q);
const wrong = q.choices.find((c) => c.id !== q.correctId);
game.handleAnswer(wrong.id);
assert.equal(game.isActive(), true);
assert.ok(moods.includes("oops"));

game.handleAnswer(q.correctId);
assert.equal(els.choiceNext.hidden, false);
assert.ok(els.choicePrompt.classList.contains("found"));
assert.equal(game.score().correct, 1);

game.stop();
assert.equal(els.choicePrompt.hidden, true);
assert.ok(!bodyClass.contains("choice-mode"));
assert.equal(game.score().asked, 0);

console.log("choice-game.check.js OK");
