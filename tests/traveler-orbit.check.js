import assert from "node:assert/strict";
import { TRAVELER_PERIOD, travelerPos, issLocalPos } from "../traveler-orbit.js";
import { earthLocalPos } from "../earth-fx.js";

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
assert.ok(Math.abs(Math.hypot(...p) - R * 1.16) < 1e-9);
assert.deepEqual(p, earthLocalPos(0, 0, 0.16, R));

const later = issLocalPos(TRAVELER_PERIOD / 4, R);
assert.ok(Math.abs(Math.hypot(...later) - R * 1.16) < 1e-9);
assert.notDeepEqual(later, p);
assert.deepEqual(later, earthLocalPos(peak.lat, peak.lng, 0.16, R));

console.log("traveler-orbit.check.js OK");

