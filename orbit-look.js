/** Altitude bands and sun path. No Three.js — keep this testable. */

export const DEEP_SPACE_ALT = 4.2;
export const SPACE_HANDOFF_ALT = 11.2;
/** True moon radius in Earth radii. */
export const MOON_RADIUS = 0.273;
// ponytail: true moon dist 60.3R, sun 23455R. Compressed to fit under SPACE_HANDOFF with Earth still readable. Angular sizes matched (real sky both ~0.5°).
export const MOON_RADII_OUT = 4.8;
export const SUN_RADII_OUT = 7.4;
export const SUN_RADIUS = SUN_RADII_OUT * (MOON_RADIUS / MOON_RADII_OUT);

/** Frame periods for createGlobe's companion rAF. 1 = every frame. */
export const GLOBE_TICK = { sun: 8, aurora: 2, weather: 2, pov: 8 };

export function dueThisFrame(frame, period) {
  const p = Number(period);
  if (!Number.isFinite(p) || p <= 1) return true;
  return frame % p === 0;
}

/** False when a sky body is sitting in/on the planet (the 168-unit moon bug). */
export function skyBodyClearOfGlobe(globeR, dist) {
  return Number(dist) > Number(globeR) * 3;
}

/**
 * @param {number} alt globe.gl altitude (radii)
 */
export function lookFromAltitude(alt) {
  const a = Number.isFinite(alt) ? alt : 2.2;
  if (a > 7) {
    return {
      band: "far",
      atmosphereColor: "#5ec8ff",
      atmosphereAltitude: 0.08,
      clouds: 0.18,
      rotate: 0.18,
    };
  }
  if (a > DEEP_SPACE_ALT) {
    return {
      band: "mid",
      atmosphereColor: "#7ad4ee",
      atmosphereAltitude: 0.14,
      clouds: 0.32,
      rotate: 0.28,
    };
  }
  return {
    band: "near",
    atmosphereColor: "#9ad8ee",
    atmosphereAltitude: 0.22,
    clouds: 0.52,
    rotate: 0.45,
  };
}

/** @param {number} alt */
export function isDeepSpace(alt) {
  return (Number.isFinite(alt) ? alt : 2) > DEEP_SPACE_ALT;
}

export function firefliesShouldTick({ reduceMotion, deepSpace, pageHidden }) {
  return !reduceMotion && !deepSpace && !pageHidden;
}

/** Pinch-out past this altitude leaves Earth for the solar view. */
export function shouldEnterSpace(alt, armed) {
  return !!armed && (Number.isFinite(alt) ? alt : 0) > SPACE_HANDOFF_ALT;
}

/** Wrap degrees to [-180, 180]. */
export function wrapLng(lng) {
  return ((((Number(lng) + 180) % 360) + 360) % 360) - 180;
}

/**
 * Where the sun is overhead. Equation of time skipped — ceiling ~15 min.
 * ponytail: upgrade with NOAA equation-of-time if we ever need eclipse-grade.
 * @param {Date} [date]
 */
export function subsolarPoint(date = new Date()) {
  const utc =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  return {
    lat: 23.44 * Math.sin((Math.PI * 2 * (day - 81)) / 365),
    lng: wrapLng((12 - utc) * 15),
  };
}

/** three-globe polar2Cartesian unit direction (Y up). */
export function latLngDirection(lat, lng) {
  const phi = ((90 - Number(lat)) * Math.PI) / 180;
  const theta = ((90 - Number(lng)) * Math.PI) / 180;
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ];
}

/** Great-circle degrees between two points. */
export function angularDistance(aLat, aLng, bLat, bLng) {
  const r = Math.PI / 180;
  const p1 = Number(aLat) * r;
  const p2 = Number(bLat) * r;
  const dL = (Number(bLng) - Number(aLng)) * r;
  const x = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dL);
  return Math.acos(Math.min(1, Math.max(-1, x))) / r;
}

/**
 * @returns {"hot"|"warm"|"cold"}
 */
export function heatHint(fromLat, fromLng, toLat, toLng) {
  const d = angularDistance(fromLat, fromLng, toLat, toLng);
  if (d < 14) return "hot";
  if (d < 40) return "warm";
  return "cold";
}

/** Camera on the terminator so the sun and moon sit in the sky beside Earth. */
export function skyShowLook(sun) {
  const s = sun || { lat: 0, lng: 0 };
  return {
    lat: Math.max(-28, Math.min(28, Number(s.lat) * 0.25)),
    lng: wrapLng(Number(s.lng) + 78),
    altitude: 10.2,
  };
}

/** @param {number} fromAlt @param {number} toAlt */
export function diveMs(fromAlt, toAlt) {
  const from = Number.isFinite(fromAlt) ? fromAlt : 2;
  const to = Number.isFinite(toAlt) ? toAlt : 2;
  return Math.round(Math.min(3400, 720 + Math.abs(from - to) * 420));
}
