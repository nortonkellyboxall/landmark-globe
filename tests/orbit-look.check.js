import assert from "node:assert/strict";
import {
  DEEP_SPACE_ALT,
  SPACE_HANDOFF_ALT,
  diveMs,
  isDeepSpace,
  firefliesShouldTick,
  lookFromAltitude,
  shouldEnterSpace,
  subsolarPoint,
  latLngDirection,
  wrapLng,
  angularDistance,
  heatHint,
  skyBodyClearOfGlobe,
  skyShowLook,
  SUN_RADII_OUT,
  SUN_RADIUS,
  MOON_RADII_OUT,
  MOON_RADIUS,
} from "../orbit-look.js";

assert.equal(lookFromAltitude(11).band, "far");
assert.equal(lookFromAltitude(5).band, "mid");
assert.equal(lookFromAltitude(2).band, "near");
assert.ok(lookFromAltitude(11).atmosphereAltitude < lookFromAltitude(2).atmosphereAltitude);

assert.equal(isDeepSpace(DEEP_SPACE_ALT + 0.01), true);
assert.equal(isDeepSpace(2), false);

assert.equal(firefliesShouldTick({ reduceMotion: true, deepSpace: false, pageHidden: false }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: true, pageHidden: false }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: false, pageHidden: true }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: false, pageHidden: false }), true);

assert.ok(diveMs(10, 2) > diveMs(3, 2));
assert.ok(diveMs(40, 1) <= 3400);

assert.equal(shouldEnterSpace(SPACE_HANDOFF_ALT + 0.2, true), true);
assert.equal(shouldEnterSpace(SPACE_HANDOFF_ALT + 0.2, false), false);
assert.equal(shouldEnterSpace(2, true), false);

assert.equal(wrapLng(190), -170);
assert.equal(wrapLng(-190), 170);

const juneNoon = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
assert.ok(juneNoon.lat > 22 && juneNoon.lat < 24);
assert.ok(Math.abs(juneNoon.lng) < 1);

const decNoon = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)));
assert.ok(decNoon.lat < -22 && decNoon.lat > -24);

const pole = latLngDirection(90, 0);
assert.ok(Math.abs(pole[0]) < 1e-9);
assert.ok(Math.abs(pole[1] - 1) < 1e-9);

assert.ok(angularDistance(0, 0, 0, 0) < 1e-9);
assert.ok(Math.abs(angularDistance(0, 0, 0, 90) - 90) < 1e-6);
assert.equal(heatHint(48, 2, 48.8, 2.3), "hot");
assert.equal(heatHint(0, 0, 0, 80), "cold");

assert.equal(skyBodyClearOfGlobe(100, 168), false);
assert.equal(skyBodyClearOfGlobe(100, 100 * SUN_RADII_OUT), true);
assert.equal(skyBodyClearOfGlobe(100, 100 * MOON_RADII_OUT), true);
assert.ok(MOON_RADIUS < 0.3);
assert.ok(SUN_RADII_OUT > MOON_RADII_OUT);
assert.ok(Math.abs(SUN_RADIUS / SUN_RADII_OUT - MOON_RADIUS / MOON_RADII_OUT) < 1e-12);

const show = skyShowLook({ lat: 23.44, lng: 0 });
assert.ok(Math.abs(show.lng - 78) < 1e-9);
assert.ok(show.altitude > 5);
assert.ok(show.altitude < SPACE_HANDOFF_ALT);

console.log("orbit-look.check.js OK");
