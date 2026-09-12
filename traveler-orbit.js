/** Toy ISS path. Period is play-speed, not the real 92 minutes. */

import { earthLocalPos } from "./earth-fx.js";

export const TRAVELER_PERIOD = 42;
/** Altitude in Earth radii for the HTML pin and the 3D craft. */
export const ISS_ALT_RADII = 0.16;

/**
 * @param {number} tSec
 * @param {number} [periodSec]
 * @param {number} [incDeg]
 */
export function travelerPos(tSec, periodSec = TRAVELER_PERIOD, incDeg = 51.6) {
  const u = (Number(tSec) / periodSec) * Math.PI * 2;
  const inc = (incDeg * Math.PI) / 180;
  return {
    lat: Math.asin(Math.sin(inc) * Math.sin(u)) * (180 / Math.PI),
    lng: Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) * (180 / Math.PI),
  };
}

/**
 * Earth-local XYZ for the ISS craft at time tSec.
 * @param {number} tSec
 * @param {number} R Earth mesh radius
 * @returns {[number, number, number]}
 */
export function issLocalPos(tSec, R) {
  const { lat, lng } = travelerPos(tSec);
  return earthLocalPos(lat, lng, ISS_ALT_RADII, R);
}
