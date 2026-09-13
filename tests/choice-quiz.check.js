import assert from "node:assert/strict";
import {
  continentKey,
  placeKind,
  hasFlagEmoji,
  languageSpeakId,
  earthChoicePool,
  spaceChoicePool,
  choicePool,
  buildWhereIs,
  buildFlagCountry,
  buildWhichLanguage,
  buildWhichInContinent,
  buildWhichContinent,
  buildWhichKind,
  buildChoiceQuestion,
  promptSpeakPlan,
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
assert.equal(hasFlagEmoji({ kind: "country", emoji: "🇫🇷" }), true);
assert.equal(hasFlagEmoji({ kind: "landmark", emoji: "🗼" }), false);
assert.equal(languageSpeakId("English and French"), "lang-english-and-french");

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
assert.equal(where.speakCueId, "quiz-where-is");
assert.ok(where.choices.length >= 3 && where.choices.length <= 4);
assert.ok(where.choices.some((c) => c.id === where.correctId));
assert.equal(new Set(where.choices.map((c) => c.id)).size, where.choices.length);

const flagQ = buildFlagCountry(earth, rand);
assert.ok(flagQ);
assert.equal(flagQ.type, "flagCountry");
assert.match(flagQ.prompt, /flag/i);
assert.ok(hasFlagEmoji(flagQ.subject));
assert.equal(flagQ.speakCueId, "quiz-flag-country");

const langQ = buildWhichLanguage(earth, rand);
assert.ok(langQ);
assert.equal(langQ.type, "whichLanguage");
assert.match(langQ.prompt, /language/i);
assert.ok(langQ.subject.language);
assert.equal(langQ.speakCueId, "quiz-language");
assert.equal(langQ.speakSubjectId, langQ.subject.id);
assert.ok(langQ.choices.every((c) => c.id.startsWith("lang-")));

const inCont = buildWhichInContinent(earth, CONTINENTS, rand);
assert.ok(inCont);
assert.match(inCont.prompt, /^Which is in /);
assert.deepEqual(promptSpeakPlan(inCont).map((p) => p.id), [
  "quiz-which-in",
  inCont.subject.id,
]);
assert.ok(inCont.choices.some((c) => c.id === inCont.correctId));
const correctPlace = earth.find((p) => p.id === inCont.correctId);
assert.equal(continentKey(correctPlace), inCont.subject.id);

const whichCont = buildWhichContinent(earth, CONTINENTS, rand);
assert.ok(whichCont);
assert.match(whichCont.prompt, /continent/);
assert.equal(whichCont.speakCueId, "quiz-which-continent");
assert.ok(whichCont.choices.some((c) => c.id === whichCont.correctId));
assert.equal(continentKey(whichCont.subject), whichCont.correctId);

const whichKind = buildWhichKind(earth, rand);
assert.ok(whichKind);
assert.match(whichKind.prompt, /^Which is /);
assert.ok(whichKind.speakCueId.startsWith("quiz-kind-"));
assert.equal(whichKind.subject.id, whichKind.correctId);

const mixed = [...LANDMARKS, ...WONDERS, ...CONTINENTS, ...COUNTRIES];
const seenTypes = new Set();
for (let i = 0; i < 40; i++) {
  const q = buildChoiceQuestion(mixed, { continents: CONTINENTS, rand });
  assert.ok(q, "expected a question from full earth pack");
  assert.ok(q.choices.length >= 3);
  assert.ok(q.choices.some((c) => c.id === q.correctId));
  assert.ok(q.speakCueId, "every question needs a speak cue");
  seenTypes.add(q.type);
}
assert.ok(seenTypes.size >= 3, "expected multiple question templates over seeded draws");
assert.ok(seenTypes.has("flagCountry") || seenTypes.has("whichLanguage"), "expected flag or language template");

// Live Math.random should mix templates (not stuck on one builder).
const liveTypes = new Set();
for (let i = 0; i < 60; i++) {
  const q = buildChoiceQuestion(mixed, { continents: CONTINENTS });
  assert.ok(q);
  liveTypes.add(q.type);
}
assert.ok(liveTypes.size >= 3, "expected >=3 templates with Math.random, got " + [...liveTypes]);
assert.ok(liveTypes.has("flagCountry"), "expected flagCountry in live mix");
assert.ok(liveTypes.has("whichLanguage"), "expected whichLanguage in live mix");

const spaceQ = buildChoiceQuestion(space, { tab: "space", rand });
assert.ok(spaceQ);
assert.ok(spaceQ.type === "whereIs" || spaceQ.type === "whichKind");

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

// Honest language gaps stay out of the language pool.
assert.ok(!COUNTRIES.find((c) => c.id === "india")?.language);
assert.ok(!COUNTRIES.find((c) => c.id === "switzerland")?.language);
assert.ok(COUNTRIES.filter((c) => c.language).length >= 40);

console.log("choice-quiz.check.js OK");
