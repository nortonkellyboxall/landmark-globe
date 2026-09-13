import assert from "node:assert/strict";
import {
  continentKey,
  placeKind,
  earthChoicePool,
  spaceChoicePool,
  choicePool,
  buildWhereIs,
  buildWhichInContinent,
  buildWhichContinent,
  buildWhichKind,
  buildChoiceQuestion,
  createChoiceQuiz,
} from "../choice-quiz.js";
import { LANDMARKS, WONDERS, CONTINENTS, COUNTRIES, allPlaces } from "../place.js";
import { SPACE_BODIES } from "../space-catalog.js";

assert.equal(continentKey({ kind: "continent", id: "africa" }), "africa");
assert.equal(continentKey({ kind: "country", continent: "europe" }), "europe");
assert.equal(continentKey({ name: "Eiffel", continent: "Europe", lat: 48 }), "europe");
assert.equal(continentKey({ name: "Statue", continent: "Americas", lat: 40 }), "northamerica");
assert.equal(continentKey({ name: "Christ", continent: "Americas", lat: -22 }), "southamerica");
assert.equal(placeKind({ id: "x" }), "landmark");
assert.equal(placeKind({ kind: "wonder" }), "wonder");

const earth = earthChoicePool(allPlaces());
assert.ok(earth.length >= 40);
assert.ok(earth.some((p) => p.id === "eiffel"));
assert.ok(earth.some((p) => p.kind === "country"));
assert.ok(earth.some((p) => p.kind === "continent"));
assert.ok(!earth.some((p) => p.id === "iss" || p.id === "mars"));

const space = spaceChoicePool(SPACE_BODIES);
assert.ok(space.some((p) => p.id === "mars"));
assert.ok(!space.some((p) => p.kind === "station"));
assert.equal(choicePool("space", SPACE_BODIES).length, space.length);
assert.equal(choicePool("landmarks", allPlaces()).length, earth.length);

let seq = 0;
const rand = () => {
  seq += 0.17;
  return seq % 1;
};

const where = buildWhereIs(earth, rand);
assert.ok(where);
assert.equal(where.type, "whereIs");
assert.ok(where.choices.length >= 3 && where.choices.length <= 4);
assert.ok(where.choices.some((c) => c.id === where.correctId));
assert.equal(new Set(where.choices.map((c) => c.id)).size, where.choices.length);

const inCont = buildWhichInContinent(earth, CONTINENTS, rand);
assert.ok(inCont);
assert.match(inCont.prompt, /^Which is in /);
assert.ok(inCont.choices.some((c) => c.id === inCont.correctId));
const correctPlace = earth.find((p) => p.id === inCont.correctId);
assert.equal(continentKey(correctPlace), inCont.subject.id);

const whichCont = buildWhichContinent(earth, CONTINENTS, rand);
assert.ok(whichCont);
assert.match(whichCont.prompt, /continent/);
assert.ok(whichCont.choices.some((c) => c.id === whichCont.correctId));
assert.equal(continentKey(whichCont.subject), whichCont.correctId);

const whichKind = buildWhichKind(earth, rand);
assert.ok(whichKind);
assert.match(whichKind.prompt, /^Which is /);
assert.equal(whichKind.subject.id, whichKind.correctId);

const mixed = [...LANDMARKS, ...WONDERS, ...CONTINENTS, ...COUNTRIES];
for (let i = 0; i < 20; i++) {
  const q = buildChoiceQuestion(mixed, { continents: CONTINENTS, rand });
  assert.ok(q, "expected a question from full earth pack");
  assert.ok(q.choices.length >= 3);
  assert.ok(q.choices.some((c) => c.id === q.correctId));
}

const spaceQ = buildChoiceQuestion(space, { tab: "space", rand });
assert.ok(spaceQ);

let prompted = null;
let correctHits = 0;
const quiz = createChoiceQuiz({
  onPrompt: (q) => {
    prompted = q;
  },
  onCorrect: () => {
    correctHits += 1;
  },
});

const round = quiz.start(earth, { continents: CONTINENTS, rand: () => 0.2 });
assert.ok(round);
assert.equal(prompted.correctId, round.correctId);
const wrongId = round.choices.find((c) => c.id !== round.correctId).id;
assert.equal(quiz.answer(wrongId).correct, false);
assert.equal(quiz.isActive(), true);
assert.equal(quiz.answer(round.correctId).correct, true);
assert.equal(correctHits, 1);
assert.equal(quiz.isActive(), false);
assert.equal(quiz.score().correct, 1);
assert.equal(quiz.score().asked, 1);

console.log("choice-quiz.check.js OK");
