/** Find-quiz — guided “tap the pin” rounds. Keeps the full pool as options. */

/**
 * @typedef {object} Place
 * @property {string} id
 * @property {string} [name]
 * @property {string} [emoji]
 * @property {string} [continent]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {string[]} [photos]
 */

/**
 * @param {Place[]} pool
 * @returns {Place[]}
 */
export function geoPool(pool) {
  return (pool || []).filter((p) => p && p.id && p.lat != null && p.lng != null);
}

/**
 * @param {{
 *   onPrompt?: (target: Place, pins: Place[]) => void,
 *   onCorrect?: (target: Place) => void,
 *   onWrong?: (tapped: Place, target: Place) => void,
 *   onCancel?: () => void,
 * }} [opts]
 */
export function createFindQuiz(opts = {}) {
  let active = null;

  function cancel() {
    if (!active) return;
    active = null;
    if (opts.onCancel) opts.onCancel();
  }

  /**
   * @param {Place[]} pool
   * @param {{ pickTarget?: (pool: Place[]) => Place }} [startOpts]
   */
  function start(pool, startOpts = {}) {
    const list = geoPool(pool);
    if (list.length < 2) return null;
    if (active) active = null;
    const pick =
      startOpts.pickTarget ||
      ((items) => items[Math.floor(Math.random() * items.length)]);
    const target = pick(list);
    if (!target) return null;
    const pins = list;
    active = { target, pins };
    if (opts.onPrompt) opts.onPrompt(target, pins);
    return active;
  }

  /** @param {string} placeId */
  function handlePinTap(placeId) {
    if (!active) return { handled: false };
    if (placeId === active.target.id) {
      const found = active.target;
      active = null;
      if (opts.onCorrect) opts.onCorrect(found);
      return { handled: true, correct: true, target: found };
    }
    const tapped = active.pins.find((p) => p.id === placeId) || { id: placeId };
    if (opts.onWrong) opts.onWrong(tapped, active.target);
    return { handled: true, correct: false, target: active.target };
  }

  return {
    start,
    cancel,
    handlePinTap,
    isActive: () => !!active,
    getTarget: () => (active ? active.target : null),
  };
}
