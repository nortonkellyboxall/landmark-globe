/** Find progress — session streak + persisted sticker collection. */

export const FOUND_KEY = "world-adventures:found-ids";
export const STAR_CAP = 5;

function readFound(storage) {
  try {
    const raw = storage.getItem(FOUND_KEY);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((id) => typeof id === "string" && id));
  } catch {
    return new Set();
  }
}

/**
 * @param {{
 *   storage?: { getItem: (k: string) => string|null, setItem: (k: string, v: string) => void },
 *   rand?: () => number,
 * }} [opts]
 */
export function createFindProgress(opts = {}) {
  const storage = opts.storage || (typeof localStorage !== "undefined" ? localStorage : {
    getItem() { return null; },
    setItem() {},
  });
  const rand = opts.rand || Math.random;
  const found = readFound(storage);
  let streak = 0;

  function save() {
    try {
      storage.setItem(FOUND_KEY, JSON.stringify([...found]));
    } catch {
      // quota / private mode — keep in-memory collection
    }
  }

  function pickTarget(pool) {
    const list = (pool || []).filter((p) => p && p.id);
    if (!list.length) return null;
    const fresh = list.filter((p) => !found.has(p.id));
    const pickFrom = fresh.length ? fresh : list;
    const i = Math.floor(rand() * pickFrom.length);
    return pickFrom[i] || pickFrom[0];
  }

  /** @param {string} id */
  function recordFind(id) {
    const isNew = !found.has(id);
    if (id) found.add(id);
    save();
    streak += 1;
    return { isNew, streak, foundCount: found.size };
  }

  return {
    isFound: (id) => found.has(id),
    foundIds: () => [...found],
    foundCount: () => found.size,
    streak: () => streak,
    starsShown: () => Math.min(streak, STAR_CAP),
    hotStreak: () => streak >= STAR_CAP,
    recordFind,
    resetSession: () => {
      streak = 0;
    },
    pickTarget,
  };
}
