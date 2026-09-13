import assert from "node:assert/strict";
import {
  cardText,
  nameText,
  clipKey,
  textHash,
  expectedClipSources,
  languageClipId,
  PHASE_NAMES,
  QUIZ_CUES,
} from "../scripts/speak-clip-hash.mjs";

const sample = {
  id: "eiffel",
  name: "Eiffel Tower",
  place: "Paris, France",
  story: "A tall iron tower.",
  wow: "It sparkles at night.",
};

assert.equal(nameText(sample), "Eiffel Tower.");
assert.match(cardText(sample), /Wow fact\. It sparkles at night\./);
assert.equal(clipKey("eiffel", "card"), "eiffel.card");
assert.equal(textHash("a"), textHash("a"));
assert.notEqual(textHash("a"), textHash("b"));
assert.equal(languageClipId("English and French"), "lang-english-and-french");

const sources = expectedClipSources([sample]);
assert.equal(sources.get("eiffel.name"), "Eiffel Tower.");
assert.equal(sources.has("eiffel.card"), true);
assert.equal(sources.has("quiz-where-is.name"), true);
assert.equal(sources.size, 2 + PHASE_NAMES.length + QUIZ_CUES.length);

const withLang = { ...sample, id: "france", name: "France", language: "French" };
const langSources = expectedClipSources([withLang]);
assert.equal(langSources.get("lang-french.name"), "French.");
assert.equal(langSources.size, 2 + PHASE_NAMES.length + QUIZ_CUES.length + 1);

const drifted = { ...sample, story: "Changed story." };
assert.notEqual(textHash(cardText(sample)), textHash(cardText(drifted)));

console.log("speak-clip-hash.check.js OK");
