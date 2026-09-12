import assert from "node:assert/strict";
import { TRAVELER_PERIOD, travelerPos, issLocalPos, ISS_ALT_RADII } from "../traveler-orbit.js";

const a = travelerPos(0);
assert.ok(Math.abs(a.lat) < 1e-9);
assert.ok(Math.abs(a.lng) < 1e-9);

const peak = travelerPos(TRAVELER_PERIOD / 4);
assert.ok(peak.lat > 50 && peak.lat < 53);

const back = travelerPos(TRAVELER_PERIOD);
assert.ok(Math.abs(back.lat) < 1e-6);
assert.ok(Math.abs(back.lng) < 1e-6);

const R = 2;
const p = issLocalPos(0, R);
assert.equal(p.length, 3);
assert.ok(Math.abs(Math.hypot(...p) - R * (1 + ISS_ALT_RADII)) < 1e-9);

console.log("traveler-orbit.check.js OK");
