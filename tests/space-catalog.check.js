import assert from "node:assert/strict";
import {
  SPACE_BODIES,
  diameterKm,
  orbitSpinSeconds,
  EARTH_YEAR_SECONDS,
} from "../space-catalog.js";

assert.equal(SPACE_BODIES.length, 12);
assert.equal(SPACE_BODIES.find((b) => b.id === "earth").au, 1);
assert.equal(diameterKm("jupiter"), 139820);
assert.equal(diameterKm("earth"), 12742);
assert.equal(diameterKm(SPACE_BODIES.find((b) => b.id === "earth")), 12742);
assert.equal(orbitSpinSeconds(1), Math.max(3.5, EARTH_YEAR_SECONDS));
assert.equal(SPACE_BODIES.find((b) => b.id === "mercury").visual.orbit, 12);
assert.equal(SPACE_BODIES.find((b) => b.id === "moon").visual.parent, "earth");
console.log("space-catalog.check.js OK");
