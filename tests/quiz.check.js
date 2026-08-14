import assert from "node:assert/strict";
import { geoPool, findPool, createFindQuiz } from "../quiz.js";

const pool = [
  { id: "a", continent: "Europe", lat: 1, lng: 1 },
  { id: "b", continent: "Europe", lat: 2, lng: 2 },
  { id: "c", continent: "Europe", lat: 3, lng: 3 },
  { id: "d", continent: "Asia", lat: 4, lng: 4 },
  { id: "spacey", lat: null, lng: null },
];

assert.equal(geoPool(pool).length, 4);

const spacePlaces = [
  { id: "sun", kind: "star" },
  { id: "mars", kind: "planet" },
  { id: "iss", kind: "station" },
  { id: "luna", kind: "moon" },
];
assert.deepEqual(
  findPool("space", spacePlaces).map((p) => p.id),
  ["sun", "mars", "luna"]
);
assert.equal(findPool("landmarks", pool).length, geoPool(pool).length);
assert.equal(findPool("wonders", pool).length, 4);

let prompted = null;
let correctId = null;
const quiz = createFindQuiz({
  onPrompt: (t, p) => {
    prompted = { id: t.id, n: p.length };
  },
  onCorrect: (t) => {
    correctId = t.id;
  },
});

const round = quiz.start(geoPool(pool), { pickTarget: () => pool[0] });
assert.ok(round);
assert.equal(prompted.n, 4);
assert.equal(quiz.handlePinTap("b").correct, false);
assert.equal(quiz.isActive(), true);
assert.equal(quiz.handlePinTap("a").correct, true);
assert.equal(correctId, "a");
assert.equal(quiz.isActive(), false);

const space = [
  { id: "sun", kind: "star" },
  { id: "mars", kind: "planet" },
];
let spacePrompt = null;
const spaceQuiz = createFindQuiz({
  onPrompt: (t, p) => {
    spacePrompt = { id: t.id, n: p.length };
  },
});
assert.ok(spaceQuiz.start(space, { pickTarget: () => space[0] }));
assert.equal(spacePrompt.n, 2);
assert.equal(spaceQuiz.handlePinTap("mars").correct, false);
assert.equal(spaceQuiz.handlePinTap("sun").correct, true);

console.log("quiz.check.js OK");
