/** Pure Earth-surface FX helpers (no Three.js). */

import { latLngDirection, wrapLng, subsolarPoint } from "./orbit-look.js";

/** Hours → Earth yaw radians (15° per hour). */
export function sunYawRadians(hours) {
  const h = Number.isFinite(hours) ? hours : 0;
  return (h * Math.PI) / 12;
}

/**
 * Position on/above Earth in mesh-local space.
 * @param {number} lat
 * @param {number} lng
 * @param {number} alt altitude in Earth radii (0 = surface)
 * @param {number} R Earth radius
 * @returns {[number, number, number]}
 */
export function earthLocalPos(lat, lng, alt, R) {
  const r = Number(R);
  if (!Number.isFinite(r) || r <= 0) return [0, 0, 0];
  const a = Number.isFinite(alt) ? alt : 0;
  const [dx, dy, dz] = latLngDirection(lat, lng);
  const dist = r * (1 + a);
  return [dx * dist, dy * dist, dz * dist];
}

/** Night-side longitude for aurora (opposite the subsolar point, plus sunHours). */
export function auroraNightLng(date = new Date(), sunHours = 0) {
  const when = new Date(date.getTime() + (Number.isFinite(sunHours) ? sunHours : 0) * 3600000);
  return wrapLng(subsolarPoint(when).lng + 180);
}

/** Scale old globe.gl (~R=100) lengths down to shared-world Earth R. */
export function fxScale(R, oldUnits) {
  const r = Number(R);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return (r / 100) * Number(oldUnits);
}
