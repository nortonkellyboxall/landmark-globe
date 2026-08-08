import assert from "node:assert/strict";
import {
  SPACE_BODIES,
  getBody,
  diameterKm,
  orbitRadiusPct,
  orbitSpinSeconds,
  EARTH_YEAR_SECONDS,
} from "../space-catalog.js";

assert.equal(SPACE_BODIES.length, 12);
assert.equal(getBody("earth").au, 1);
assert.equal(diameterKm("jupiter"), 139820);
assert.equal(diameterKm(getBody("earth")), 12742);
assert.ok(orbitRadiusPct(0.39) < orbitRadiusPct(30.05));
assert.equal(orbitSpinSeconds(1), Math.max(3.5, EARTH_YEAR_SECONDS));
assert.equal(getBody("mercury").visual.orbit, 12);
assert.equal(getBody("moon").visual.parent, "earth");
console.log("space-catalog.check.js OK");
