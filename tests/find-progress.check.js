import assert from "node:assert/strict";
import { createFindProgress, FOUND_KEY, STAR_CAP } from "../find-progress.js";

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
  };
}

const pool = [
  { id: "eiffel" },
  { id: "fuji" },
  { id: "uluru" },
];

const empty = createFindProgress({ storage: memoryStorage() });
assert.equal(empty.foundCount(), 0);
assert.equal(empty.streak(), 0);
assert.equal(empty.starsShown(), 0);
assert.equal(empty.isFound("eiffel"), false);

const first = empty.recordFind("eiffel");
assert.equal(first.isNew, true);
assert.equal(first.streak, 1);
assert.equal(first.foundCount, 1);
assert.equal(empty.isFound("eiffel"), true);
assert.equal(empty.starsShown(), 1);
assert.equal(empty.hotStreak(), false);

const again = empty.recordFind("eiffel");
assert.equal(again.isNew, false);
assert.equal(again.streak, 2);
assert.equal(again.foundCount, 1);

empty.resetSession();
assert.equal(empty.streak(), 0);
assert.equal(empty.starsShown(), 0);
assert.equal(empty.isFound("eiffel"), true);

for (let i = 0; i < STAR_CAP; i++) empty.recordFind("fuji");
assert.equal(empty.starsShown(), STAR_CAP);
assert.equal(empty.hotStreak(), true);
assert.ok(empty.streak() >= STAR_CAP);

const seeded = createFindProgress({
  storage: memoryStorage({ [FOUND_KEY]: JSON.stringify(["eiffel", "fuji"]) }),
  rand: () => 0,
});
assert.equal(seeded.foundCount(), 2);
assert.equal(seeded.pickTarget(pool)?.id, "uluru");

const allFound = createFindProgress({
  storage: memoryStorage({ [FOUND_KEY]: JSON.stringify(["eiffel", "fuji", "uluru"]) }),
  rand: () => 0,
});
assert.equal(allFound.pickTarget(pool)?.id, "eiffel");
assert.equal(allFound.pickTarget([]), null);

const corrupt = createFindProgress({
  storage: memoryStorage({ [FOUND_KEY]: "{not-json" }),
});
assert.equal(corrupt.foundCount(), 0);

const persistStore = memoryStorage();
const a = createFindProgress({ storage: persistStore });
a.recordFind("uluru");
const b = createFindProgress({ storage: persistStore });
assert.equal(b.isFound("uluru"), true);
assert.equal(b.streak(), 0);

console.log("find-progress.check.js OK");
