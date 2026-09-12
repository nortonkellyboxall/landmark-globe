import assert from "node:assert/strict";
import { highlightEmissiveIntensity, punchAllowed } from "../body-highlight.js";

assert.equal(punchAllowed("earth"), true);
assert.equal(punchAllowed("solar"), false);
assert.equal(punchAllowed(undefined), false);

const bodies = new Set(["sun", "earth", "mars"]);

// Night Earth must stay readable when a landmark id is highlighted
const nightEarthLandmark = highlightEmissiveIntensity("earth", "eiffel", {
  earthNight: true,
  hasEmissiveMap: true,
  bodyIds: bodies,
});
assert.equal(nightEarthLandmark, 0.75);

// Night Earth stays readable while Mars is the Find target
const nightEarthMars = highlightEmissiveIntensity("earth", "mars", {
  earthNight: true,
  hasEmissiveMap: true,
  bodyIds: bodies,
});
assert.equal(nightEarthMars, 0.75);

const marsBoost = highlightEmissiveIntensity("mars", "mars", {
  earthNight: true,
  bodyIds: bodies,
});
assert.equal(marsBoost, 0.35);

const sunRest = highlightEmissiveIntensity("sun", "mars", {
  earthNight: true,
  bodyIds: bodies,
});
assert.equal(sunRest, 0.85);

// Clearing / null restores night Earth base
assert.equal(
  highlightEmissiveIntensity("earth", null, {
    earthNight: true,
    hasEmissiveMap: true,
    bodyIds: bodies,
  }),
  0.75
);

// Day Earth resting
assert.equal(
  highlightEmissiveIntensity("earth", "eiffel", {
    earthNight: false,
    hasEmissiveMap: true,
    bodyIds: bodies,
  }),
  0.55
);

// Earth as Find target still pops
assert.ok(
  highlightEmissiveIntensity("earth", "earth", {
    earthNight: true,
    hasEmissiveMap: true,
    bodyIds: bodies,
  }) >= 0.75
);

console.log("body-highlight.check.js OK");
