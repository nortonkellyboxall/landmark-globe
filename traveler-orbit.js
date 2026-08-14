/** Toy ISS path. Period is play-speed, not the real 92 minutes. */

export const TRAVELER_PERIOD = 42;

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
