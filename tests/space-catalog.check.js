import assert from "node:assert/strict";
import {
  SPACE_BODIES,
  diameterKm,
  orbitSpinSeconds,
  EARTH_YEAR_SECONDS,
  orbitLayoutRadius,
  orbitLayoutEccentricity,
  REAL_AU_SCALE,
  SQRT_AU_SCALE,
} from "../space-catalog.js";

assert.equal(SPACE_BODIES.length, 12);
assert.equal(SPACE_BODIES.find((b) => b.id === "earth").au, 1);
assert.equal(diameterKm("jupiter"), 139820);
assert.equal(diameterKm("earth"), 12742);
assert.equal(diameterKm(SPACE_BODIES.find((b) => b.id === "earth")), 12742);
assert.equal(orbitSpinSeconds(1), Math.max(3.5, EARTH_YEAR_SECONDS));
assert.equal(SPACE_BODIES.find((b) => b.id === "mercury").visual.orbit, 12);
assert.equal(SPACE_BODIES.find((b) => b.id === "moon").visual.parent, "earth");

assert.equal(orbitLayoutRadius(1, "real"), REAL_AU_SCALE);
assert.equal(orbitLayoutRadius(1, "sqrt"), SQRT_AU_SCALE);
assert.ok(orbitLayoutRadius(0.39, "real") < orbitLayoutRadius(1, "real"));
assert.ok(orbitLayoutRadius(30.05, "sqrt") < orbitLayoutRadius(30.05, "real"));
assert.equal(orbitLayoutEccentricity(0.007, "real"), 0.007);
assert.ok(orbitLayoutEccentricity(0.007, "sqrt") >= 0.18);
assert.ok(SPACE_BODIES.find((b) => b.id === "mercury").visual.eccentricity > 0.1);
console.log("space-catalog.check.js OK");
