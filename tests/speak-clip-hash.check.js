import assert from "node:assert/strict";
import {
  cardText,
  nameText,
  clipKey,
  textHash,
  expectedClipSources,
  PHASE_NAMES,
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

const sources = expectedClipSources([sample]);
assert.equal(sources.get("eiffel.name"), "Eiffel Tower.");
assert.equal(sources.has("eiffel.card"), true);
assert.equal(sources.size, 2 + PHASE_NAMES.length);

const drifted = { ...sample, story: "Changed story." };
assert.notEqual(textHash(cardText(sample)), textHash(cardText(drifted)));

console.log("speak-clip-hash.check.js OK");
