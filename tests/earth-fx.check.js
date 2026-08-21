import assert from "node:assert/strict";
import { earthLocalPos, sunYawRadians, auroraNightLng, fxScale } from "../earth-fx.js";
import { latLngDirection, wrapLng, subsolarPoint } from "../orbit-look.js";

assert.equal(sunYawRadians(0), 0);
assert.ok(Math.abs(sunYawRadians(12) - Math.PI) < 1e-12);
assert.ok(Math.abs(sunYawRadians(24) - Math.PI * 2) < 1e-12);
assert.equal(sunYawRadians(NaN), 0);

const R = 2;
const [x, y, z] = earthLocalPos(0, 0, 0, R);
const [dx, dy, dz] = latLngDirection(0, 0);
assert.ok(Math.abs(x - dx * R) < 1e-12);
assert.ok(Math.abs(y - dy * R) < 1e-12);
assert.ok(Math.abs(z - dz * R) < 1e-12);

const high = earthLocalPos(0, 0, 1, R);
assert.ok(Math.abs(Math.hypot(...high) - R * 2) < 1e-12);
assert.deepEqual(earthLocalPos(0, 0, 0, 0), [0, 0, 0]);

const noon = new Date(Date.UTC(2026, 5, 21, 12, 0, 0));
const sun = subsolarPoint(noon);
assert.ok(Math.abs(auroraNightLng(noon, 0) - wrapLng(sun.lng + 180)) < 1e-9);
assert.ok(Math.abs(auroraNightLng(noon, 12) - wrapLng(sun.lng + 180 + 180)) < 1e-6);

assert.equal(fxScale(2, 100), 2);
assert.equal(fxScale(2, 50), 1);
assert.equal(fxScale(0, 50), 0);

console.log("earth-fx.check.js OK");
