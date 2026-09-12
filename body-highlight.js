/**
 * Pure emissive intensities for Space Find / open highlight.
 * Earth never uses the generic dim path so night city lights stay readable.
 */

/**
 * @param {string} key body id
 * @param {string | null | undefined} targetId highlight target (body id, landmark id, or null)
 * @param {{
 *   earthNight?: boolean,
 *   hasEmissiveMap?: boolean,
 *   bodyIds?: { has: (id: string) => boolean } | null,
 * }} [opts]
 * @returns {number}
 */
export function highlightEmissiveIntensity(key, targetId, opts = {}) {
  const earthNight = !!opts.earthNight;
  const hasEmissiveMap = !!opts.hasEmissiveMap;
  const bodyIds = opts.bodyIds;
  const known = targetId
    ? bodyIds
      ? bodyIds.has(targetId)
      : true
    : false;

  if (key === "earth") {
    const base = earthNight ? 0.75 : hasEmissiveMap ? 0.55 : 0.08;
    if (targetId === "earth") return earthNight ? Math.max(base, 1) : 0.35;
    return base;
  }

  if (known && key === targetId) {
    return key === "sun" ? 1.15 : 0.35;
  }
  return key === "sun" ? 0.85 : 0.12;
}

/** Punch is an Earth-camera cheer; skip under Space (solar) chrome. */
export function punchAllowed(viewMode) {
  return viewMode === "earth";
}
