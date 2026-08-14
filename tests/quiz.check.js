import assert from "node:assert/strict";
import { geoPool, createFindQuiz } from "../quiz.js";

const pool = [
  { id: "a", continent: "Europe", lat: 1, lng: 1 },
  { id: "b", continent: "Europe", lat: 2, lng: 2 },
  { id: "c", continent: "Europe", lat: 3, lng: 3 },
  { id: "d", continent: "Asia", lat: 4, lng: 4 },
  { id: "spacey", lat: null, lng: null },
];

assert.equal(geoPool(pool).length, 4);

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

const round = quiz.start(pool, { pickTarget: () => pool[0] });
assert.ok(round);
assert.equal(prompted.n, 4);
assert.equal(quiz.handlePinTap("b").correct, false);
assert.equal(quiz.isActive(), true);
assert.equal(quiz.handlePinTap("a").correct, true);
assert.equal(correctId, "a");
assert.equal(quiz.isActive(), false);

console.log("quiz.check.js OK");
