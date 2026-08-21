import { LANDMARKS } from "./landmarks.js";
import { WONDERS } from "./wonders.js";
import { CONTINENTS, COUNTRIES } from "./geography.js";
import { SPACE_BODIES } from "./space-catalog.js";

/**
 * @typedef {object} Place
 * @property {string} id
 * @property {string} name
 * @property {string} [place]
 * @property {string} [story]
 * @property {string} [wow]
 * @property {string[]} [photos]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {string} [video]
 * @property {string} [anthem]
 * @property {string} [emoji]
 * @property {string} [color]
 * @property {string} [kind]
 * @property {string} [continent]
 */

export { LANDMARKS, WONDERS, CONTINENTS, COUNTRIES };

const PACKS = [LANDMARKS, WONDERS, CONTINENTS, COUNTRIES, SPACE_BODIES];

/** @param {string} id @returns {Place | null} */
export function placeById(id) {
  for (const items of PACKS) {
    const hit = items.find((p) => p.id === id);
    if (hit) return hit;
  }
  return null;
}

/** @returns {Place[]} */
export function allPlaces() {
  return PACKS.flat();
}
