# Deepen Boot Seams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peel Find quiz, space handoff, adventure navigation, and Sound ambient mapping out of `boot.js` into deep modules, then thin `openLandmark` so it is no longer the cross-cutting hub.

**Architecture:** One sequenced peel of `boot.js`, not five independent refactors. Find quiz first (highest friction), then space handoff, then adventure navigation. `openLandmark` shrinks because those modules absorb tap-routing and tab/space paths — do **not** add a fourth `selection.js`. Sound last: replace `{ activeTab, selectedId }` with a tiny `ambientKind` so Sound no longer knows adventure tabs. ADR 0002 holds: quiz rules stay out of Globe and CardMedia. Do not resurrect `chrome.js`.

**Tech Stack:** Vanilla JS ES modules, existing importmap, Node `assert` self-checks (no test runner, no jsdom, no new deps).

## Global Constraints

- No bundler / no new npm deps
- Do not rebuild globe.gl / dual Three
- Do not merge `toy.css` into `app.css`
- Do not recreate `chrome.js` (ponytail inlined it; adventure.js is the new name)
- ADR 0002: quiz rules stay out of Globe and CardMedia
- Content packs (`landmarks.js`, `wonders.js`, `geography.js`) stay shallow `window.*` arrays
- Preserve kid-facing UX (find rounds, stickers, heat, space pinch, continent join, ambient)
- Node assert checks only — fake `els` / in-memory storage, never jsdom
- After every code task: `graphify update .` with Shell `required_permissions: ["all"]` (sandbox blocks ProcessPoolExecutor). Use `--force` if shrink-guard fires.
- Keep uncommitted work: branch from current HEAD, do not reset

## File map

| File | Responsibility |
|------|----------------|
| `CONTEXT.md` | Glossary: Find quiz, Space handoff, Adventure navigation, ambient kind |
| `quiz.js` | Round machine (`createFindQuiz`) + `findPool(tab, places)` |
| `find-game.js` | Find quiz module — prompt, stickers, heat, resume, start/stop |
| `space-mode.js` | Space handoff — enter/leave, pinch arm, sizes DOM |
| `adventure.js` | Tab pool, strip, Continent join |
| `sound.js` | Sound module; `ambientKind` is the tab/selection mapping |
| `boot.js` | Wire modules; keep Luna/sparkles/night; thinned `openLandmark` |
| `tests/quiz.check.js` | `findPool` + existing round tests |
| `tests/find-game.check.js` | Find module start/stop/resume/heat with fake els |
| `tests/space-mode.check.js` | sizes px + pinch/transition flags |
| `tests/adventure.check.js` | Continent join + tab pool |
| `tests/sound.check.js` | `ambientKind` only (no WebAudio) |

Do **not** create: `selection.js`, `chrome.js`, `space-dom.js` (sizes live in space-mode).

---

### Task 1: Glossary

**Files:**
- Modify: `CONTEXT.md`

**Interfaces:**
- Produces: domain terms used by later tasks (`Find quiz`, `Space handoff`, `Adventure navigation`)

- [ ] **Step 1: Append glossary terms**

Keep existing entries. Replace the Find quiz bullet and add the new ones:

```markdown
- **Find quiz** — Guided “tap the matching pin” loop. Round rules live in `quiz.js` (`createFindQuiz`). Prompt, pool, stickers, heat, and card-resume live in the Find quiz module (`find-game.js`). Globe and CardMedia stay free of quiz rules (ADR 0002).
- **Space handoff** — Earth↔space transition: pinch-arm, enter/leave timing, dual-view visibility, sizes strip. `solar3d.js` only renders.
- **Adventure navigation** — Active tab, current Place pool, strip, and Continent join. Not `chrome.js`.
- **Ambient kind** — `'on' | 'duck'`. Sound plays full pads when kind is `'on'` (space tab or a Place is selected); otherwise ducks. Sound does not know tab names.
```

- [ ] **Step 2: Commit**

```bash
git add CONTEXT.md
git commit -m "$(cat <<'EOF'
docs: name Find, space handoff, and adventure seams

EOF
)"
```

Then: `graphify update .` with `required_permissions: ["all"]`.

---

### Task 2: Unify `findPool` in quiz.js

**Files:**
- Modify: `quiz.js`
- Modify: `tests/quiz.check.js`

**Interfaces:**
- Consumes: existing `geoPool(pool)`
- Produces: `findPool(tab, places)` — space keeps star/planet/moon; every other tab uses `geoPool`

- [ ] **Step 1: Extend `tests/quiz.check.js`**

Keep existing asserts. Add:

```js
import { geoPool, findPool, createFindQuiz } from "../quiz.js";

const spacePlaces = [
  { id: "sun", kind: "star" },
  { id: "mars", kind: "planet" },
  { id: "iss", kind: "station" },
  { id: "luna", kind: "moon" },
];
assert.deepEqual(
  findPool("space", spacePlaces).map((p) => p.id),
  ["sun", "mars", "luna"]
);
assert.equal(findPool("landmarks", pool).length, geoPool(pool).length);
assert.equal(findPool("wonders", pool).length, 4);
```

- [ ] **Step 2: Run — expect FAIL (`findPool` is not exported)**

```bash
node tests/quiz.check.js
```

Expected: `TypeError: findPool is not a function` or import error.

- [ ] **Step 3: Implement `findPool` in `quiz.js`**

```js
/**
 * @param {string} tab
 * @param {Place[]} places
 * @returns {Place[]}
 */
export function findPool(tab, places) {
  const list = places || [];
  if (tab === "space") {
    return list.filter(
      (p) => p && p.id && (p.kind === "star" || p.kind === "planet" || p.kind === "moon")
    );
  }
  return geoPool(list);
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
node tests/quiz.check.js
```

Expected: `quiz.check.js OK`

- [ ] **Step 5: Commit**

```bash
git add quiz.js tests/quiz.check.js
git commit -m "$(cat <<'EOF'
feat(quiz): unify find pool for earth and space tabs

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 3: Find quiz module (`find-game.js`)

**Files:**
- Create: `find-game.js`
- Create: `tests/find-game.check.js`

**Interfaces:**
- Consumes: `createFindQuiz`, `findPool` from `quiz.js`; `createFindProgress`, `STAR_CAP` from `find-progress.js`; `heatHint` from `orbit-look.js`
- Produces: `createFindGame(opts)` returning:

```js
{
  start: () => void,
  stop: () => void,
  handlePinTap: (id: string) => { handled: boolean, correct?: boolean, skipFly?: boolean },
  onCardClose: () => void,
  syncHeat: (pov: { lat?: number, lng?: number }) => void,
  isActive: () => boolean,
  getTarget: () => object|null,
  showStickers: () => void,
  hideStickers: () => void,
  handleStickerTap: (id: string) => void,
  syncChrome: () => void,          // stars + stickers button
  stampFound: (id: string) => void, // optional; also called internally on correct
  speakTarget: (e?: Event) => void,
}
```

`opts` (all required unless marked):

```js
{
  els,                    // findPrompt, findCue, findEmoji, findPhoto, findAgain, findStars,
                          // stickersBtn, stickerCount, stickerSheet, stickerGrid, luna, card
  getTab: () => string,
  getPlaces: () => object[],
  lookupPlace: (id) => object|null,  // search all datasets
  getGlobe: () => object|null,
  card,                   // { close() }
  progress,               // createFindProgress() instance
  quiz,                   // createFindQuiz({ onPrompt, onCorrect, onWrong, onCancel }) — created inside
  diveMs, isDeepSpace, heatHint,
  playPop, playFanfare, playBoop, playFlyWhoosh,
  ensureAudio, speakName, setLunaMood, sparkBurst, shootingStar, flashFound,
  onOpenPlace: (id) => void,  // sticker tap when not finding and place is on current pool
}
```

Create the quiz **inside** `createFindGame` so boot does not pass callbacks. Duplicate `findTargetPlace` in boot must die — the module is the only target owner.

- [ ] **Step 1: Write `tests/find-game.check.js`**

Use classList/hidden fakes. Do not import `boot.js`.

```js
import assert from "node:assert/strict";
import { createFindGame } from "../find-game.js";
import { createFindProgress } from "../find-progress.js";
import { heatHint } from "../orbit-look.js";

function memoryStorage() {
  const data = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
  };
}

function fakeClassList() {
  const s = new Set();
  return {
    add: (c) => s.add(c),
    remove: (c) => s.delete(c),
    contains: (c) => s.has(c),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
    _has: (c) => s.has(c),
  };
}

function fakeEl(extra = {}) {
  return { hidden: true, textContent: "", classList: fakeClassList(), style: {}, dataset: {}, ...extra };
}

const places = [
  { id: "a", name: "A", emoji: "🅰️", lat: 1, lng: 1, photos: [] },
  { id: "b", name: "B", emoji: "🅱️", lat: 2, lng: 2, photos: [] },
];
const els = {
  findPrompt: fakeEl(),
  findCue: fakeEl(),
  findEmoji: fakeEl(),
  findPhoto: Object.assign(fakeEl(), { src: "", alt: "", removeAttribute(n) { delete this[n]; } }),
  findAgain: fakeEl(),
  findStars: Object.assign(fakeEl(), { innerHTML: "" }),
  stickersBtn: fakeEl(),
  stickerCount: fakeEl(),
  stickerSheet: fakeEl(),
  stickerGrid: Object.assign(fakeEl(), { innerHTML: "" }),
  luna: Object.assign(fakeEl(), { dataset: { mood: "idle" } }),
  card: Object.assign(fakeEl(), { classList: fakeClassList() }),
};
const bodyClass = fakeClassList();
const origBody = globalThis.document;
globalThis.document = {
  body: { classList: bodyClass },
  querySelectorAll: () => [],
};

let tab = "landmarks";
const progress = createFindProgress({ storage: memoryStorage(), rand: () => 0 });
const game = createFindGame({
  els,
  getTab: () => tab,
  getPlaces: () => places,
  lookupPlace: (id) => places.find((p) => p.id === id) || null,
  getGlobe: () => null,
  card: { close() {} },
  progress,
  diveMs: () => 400,
  isDeepSpace: () => false,
  heatHint,
  playPop() {},
  playFanfare() {},
  playBoop() {},
  playFlyWhoosh() {},
  ensureAudio() {},
  speakName() {},
  setLunaMood() {},
  sparkBurst() {},
  shootingStar() {},
  flashFound() {},
  onOpenPlace() {},
});

assert.equal(game.isActive(), false);
game.start();
assert.equal(game.isActive(), true);
assert.equal(game.getTarget().id, "a"); // rand() => 0 picks first fresh
assert.equal(els.findPrompt.hidden, false);
assert.equal(game.handlePinTap("b").correct, false);
assert.equal(game.isActive(), true);
const hit = game.handlePinTap("a");
assert.equal(hit.correct, true);
assert.equal(hit.skipFly, true);
assert.equal(game.isActive(), false);

game.start();
game.stop();
assert.equal(game.isActive(), false);
assert.equal(els.findPrompt.hidden, true);

game.start();
game.handlePinTap(game.getTarget().id);
game.onCardClose();
assert.equal(game.isActive(), true); // resume after card

game.syncHeat({ lat: 1, lng: 1 });

const spacePlaces = [
  { id: "sun", kind: "star" },
  { id: "iss", kind: "station" },
  { id: "mars", kind: "planet" },
];
const spaceOpts = {
  els,
  getTab: () => "space",
  getPlaces: () => spacePlaces,
  lookupPlace: (id) => spacePlaces.find((p) => p.id === id) || null,
  getGlobe: () => null,
  card: { close() {} },
  progress: createFindProgress({ storage: memoryStorage(), rand: () => 0 }),
  diveMs: () => 400,
  isDeepSpace: () => false,
  heatHint,
  playPop() {},
  playFanfare() {},
  playBoop() {},
  playFlyWhoosh() {},
  ensureAudio() {},
  speakName() {},
  setLunaMood() {},
  sparkBurst() {},
  shootingStar() {},
  flashFound() {},
  onOpenPlace() {},
};
const spaceGame = createFindGame(spaceOpts);
spaceGame.start();
assert.ok(spaceGame.getTarget());
assert.notEqual(spaceGame.getTarget().id, "iss");

globalThis.document = origBody;
console.log("find-game.check.js OK");
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

```bash
node tests/find-game.check.js
```

- [ ] **Step 3: Implement `find-game.js`**

Move these functions out of `boot.js` (current names) into the module, closing over `opts`:

- `showFindPrompt`, `hideFindPrompt`, `markFindFound`, `syncFindStars`, `syncStickersBtn`, `stampPlace`, `showStickerSheet`, `hideStickerSheet`, `handleStickerTap`, `speakFindTarget`
- `start` / `stop` from `startFindQuiz` / `stopFindQuiz`
- `findPool(getTab(), getPlaces())` instead of boot’s `findPool`
- `onCorrect` sets an internal `resumeAfterCard = true` (replaces `resumeFindAfterCard` in boot)
- `onCardClose`: if `resumeAfterCard`, clear it and `requestAnimationFrame(() => start())` — in Node tests, call `start()` synchronously if `typeof requestAnimationFrame !== "function"`
- `handlePinTap`: copy boot `openLandmark`’s find branch — wrong tap is handled here (pin-wrong class) and returns `{ handled: true, correct: false }`; correct returns `{ handled: true, correct: true, skipFly: true }`; inactive returns `{ handled: false }`
- `syncHeat`: copy `syncFindHeat` using `getTarget()` not `findTargetPlace`
- Drop boot `let findTargetPlace` — use `quiz.getTarget()` only

`createFindQuiz` is constructed inside `createFindGame` with the module’s own `onPrompt` / `onCorrect` / `onWrong` / `onCancel`.

`document.querySelectorAll` for stamp/wrong-pin: guard `typeof document === "undefined"` in tests by using `globalThis.document.querySelectorAll` from the fake (returns `[]`).

- [ ] **Step 4: Run — expect PASS**

```bash
node tests/find-game.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
```

Expected: three `OK` lines.

- [ ] **Step 5: Commit**

```bash
git add find-game.js tests/find-game.check.js
git commit -m "$(cat <<'EOF'
feat(find): peel Find quiz prompt and resume out of boot

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 4: Wire Find quiz module in boot

**Files:**
- Modify: `boot.js`

**Interfaces:**
- Consumes: `createFindGame` from Task 3
- Produces: boot calls `findGame.start/stop/handlePinTap/onCardClose/syncHeat`; no `findTargetPlace`, no local `findPool`

- [ ] **Step 1: Replace boot Find block**

Remove from boot (the `/* —— Find quiz —— */` section through `stopFindQuiz`): prompt/sticker/start/stop helpers and `const findQuiz = createFindQuiz(...)`.

Add:

```js
import { createFindGame } from "./find-game.js";
```

Keep `createFindProgress`. After `els` and `progress` exist, and after `setLunaMood` / `sparkBurst` / `shootingStar` / `flashFound` / `card` exist:

```js
const findGame = createFindGame({
  els,
  getTab: () => activeTab,
  getPlaces: () => places,
  lookupPlace: placeById,
  getGlobe: () => globe,
  card,
  progress,
  diveMs,
  isDeepSpace,
  heatHint,
  playPop,
  playFanfare,
  playBoop,
  playFlyWhoosh,
  ensureAudio: () => sound.ensureAudio(),
  speakName,
  setLunaMood,
  sparkBurst,
  shootingStar,
  flashFound,
  onOpenPlace: (id) => openLandmark(id),
});
```

`placeById` and `openLandmark` are declared later — use `function` declarations (already are) so they hoist, or assign `findGame` after `openLandmark` if needed. If temporal dead zone hits, construct `findGame` just after `openLandmark` is defined.

Card `onClose`: replace the `resumeFindAfterCard` block with `findGame.onCardClose()`.

`openLandmark` find branch: replace `findQuiz.handlePinTap` with:

```js
const result = findGame.handlePinTap(id);
if (result.handled && !result.correct) return;
if (result.handled && result.correct) skipFly = true;
```

Wrong-pin animation lives inside `findGame.handlePinTap` — delete that DOM block from `openLandmark`.

Call sites:

- `startFindQuiz()` → `findGame.start()`
- `stopFindQuiz()` → `findGame.stop()`
- `syncFindHeat(pov)` → `findGame.syncHeat(pov)`
- sticker button → `findGame.showStickers()` / `hideStickers()`
- find hear button → `findGame.speakTarget(e)`
- find again → `findGame.start()`
- `card.onClose` resume → `findGame.onCardClose()`

Delete `let resumeFindAfterCard` and `let lastHeat` and `let findTargetPlace`.

- [ ] **Step 2: Run checks**

```bash
node tests/find-game.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/orbit-look.check.js
```

Expected: all `OK`.

- [ ] **Step 3: Commit**

```bash
git add boot.js
git commit -m "$(cat <<'EOF'
refactor(boot): wire Find quiz module and drop duplicate target state

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 5: Space sizes helpers in `space-mode.js`

**Files:**
- Create: `space-mode.js`
- Create: `tests/space-mode.check.js`

**Interfaces:**
- Consumes: `diameterKm as spaceDiameterKm` from `space-catalog.js`; `diveMs`, `shouldEnterSpace` from `orbit-look.js`
- Produces: `planetDisplayPx(km, jupKm, maxPx)` and `createSpaceMode(opts)` (flags + sizes; enter/leave wired in Task 6)

- [ ] **Step 1: Write failing tests**

```js
import assert from "node:assert/strict";
import { planetDisplayPx, createSpaceMode } from "../space-mode.js";
import { SPACE_HANDOFF_ALT } from "../orbit-look.js";

assert.equal(planetDisplayPx(0, 140000, 54), 8);
assert.ok(planetDisplayPx(140000, 140000, 54) >= 50);

const flags = { transitioning: false, pinchArmed: false, tab: "landmarks" };
const mode = createSpaceMode({
  els: { ssSizesRow: null, ssSizesPanel: null, ss3d: null, solarSystem: { hidden: true, classList: { add() {}, remove() {} } }, globeViz: { classList: { add() {}, remove() {} } }, globeShadow: { classList: { add() {}, remove() {} } }, nightBtn: { style: {} }, autoNightBtn: { style: {} }, sunBtn: { hidden: false } },
  getGlobe: () => null,
  getTab: () => flags.tab,
  getNightMode: () => false,
  getSpaceItems: () => [],
  spaceDiameterKm: () => 1,
  diveMs: () => 400,
  playFlyWhoosh() {},
  setAmbient() {},
  sparkAt() {},
  onSelect() {},
  matchReduce: () => true,
});

assert.equal(mode.isTransitioning(), false);
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);
mode.armPinch();
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), true);
flags.tab = "space";
assert.equal(mode.shouldHandoff(SPACE_HANDOFF_ALT + 0.2), false);

console.log("space-mode.check.js OK");
```

`shouldHandoff(alt)` = `shouldEnterSpace(alt, pinchArmed) && getTab() !== "space" && !transitioning`.

- [ ] **Step 2: Run — expect FAIL**

```bash
node tests/space-mode.check.js
```

- [ ] **Step 3: Implement exports in `space-mode.js`**

```js
export function planetDisplayPx(km, jupKm, maxPx) {
  return Math.max(8, Math.round((km / jupKm) * maxPx));
}

export function createSpaceMode(opts) {
  let spaceTransitioning = false;
  let spacePinchArmed = false;
  let Solar3D = null;
  // loadSolar3D / ensureSolar3D / buildSizesView / setSizesOpen
  // enter / leave copied in Task 6 if Step 3 stays flags-only
  function armPinch() { spacePinchArmed = true; }
  function shouldHandoff(alt) {
    return shouldEnterSpace(alt, spacePinchArmed)
      && opts.getTab() !== "space"
      && !spaceTransitioning;
  }
  return {
    isTransitioning: () => spaceTransitioning,
    isPinchArmed: () => spacePinchArmed,
    armPinch,
    shouldHandoff,
    planetDisplayPx,
  };
}
```

Include `planetDisplayPx` as a module-level export (not only on the instance) so the test import works.

- [ ] **Step 4: Run — expect PASS**

```bash
node tests/space-mode.check.js
```

- [ ] **Step 5: Commit**

```bash
git add space-mode.js tests/space-mode.check.js
git commit -m "$(cat <<'EOF'
feat(space): add Space handoff module with pinch gate

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 6: Move enter/leave + sizes into Space handoff

**Files:**
- Modify: `space-mode.js`
- Modify: `boot.js`
- Modify: `tests/space-mode.check.js` (keep Task 5 tests passing)

**Interfaces:**
- Consumes: Task 5 `createSpaceMode`
- Produces: `enter()`, `leave() -> Promise`, `buildSizes()`, `setSizesOpen(open)`, `toggleSizes()`, `highlight(id)`, `ensure()` (lazy solar3d), `resize()`

Move from boot, unchanged behaviour:

- `buildSizesView`, `setSizesOpen`, `toggleSizesPanel`, `bindSpacePick`, `loadSolar3DModule`, `ensureSolar3D`, `enterSpaceMode`, `leaveSpaceMode`

`createSpaceMode` owns `spaceTransitioning` / `spacePinchArmed` / `Solar3D`. Boot deletes those lets.

`enter()` must call `opts.stopFind()` so Find quiz cancels on space enter (boot currently `stopFindQuiz()` at the top of `enterSpaceMode`).

`ensureSolar3D` `onSelect` calls `opts.onSelect(id)` then `opts.sparkAt(...)`.

- [ ] **Step 1: Move the functions into `space-mode.js`**

Boot constructs:

```js
const spaceMode = createSpaceMode({
  els,
  getGlobe: () => globe,
  getTab: () => activeTab,
  getNightMode: () => nightMode,
  getSpaceItems: () => DATASETS.space.items,
  spaceDiameterKm,
  diveMs,
  playFlyWhoosh,
  setAmbient: setAmbientForMode,
  sparkAt,
  onSelect: (id) => openLandmark(id),
  stopFind: () => findGame.stop(),
  matchReduce: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});
```

Replace `enterSpaceMode()` → `spaceMode.enter()`, `leaveSpaceMode()` → `spaceMode.leave()`, `buildSizesView()` → `spaceMode.buildSizes()` (call once at init where boot currently builds sizes), `setSizesOpen` / `toggleSizesPanel` → `spaceMode.*`, `Solar3D.highlight` → `spaceMode.highlight(id)`, pinch check in `syncOrbitChrome`:

```js
if (spaceMode.shouldHandoff(alt)) switchTab("space");
```

`leaveSpaceMode` used `if (activeTab !== "space")` to hide solar — keep `opts.getTab()`.

- [ ] **Step 2: Run checks**

```bash
node tests/space-mode.check.js
node tests/find-game.check.js
node tests/orbit-look.check.js
```

- [ ] **Step 3: Commit**

```bash
git add space-mode.js boot.js tests/space-mode.check.js
git commit -m "$(cat <<'EOF'
refactor(space): move Earth-space handoff and sizes out of boot

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 7: Continent join + tab pool in `adventure.js`

**Files:**
- Create: `adventure.js`
- Create: `tests/adventure.check.js`

**Interfaces:**
- Consumes: none from Find/Space (pure data)
- Produces: `placesForContinent(continentId, landmarks, wonders)` and later `createAdventure` in Task 8

Americas split stays latitude `7` (northamerica `lat >= 7`, southamerica `lat < 7`).

- [ ] **Step 1: Write `tests/adventure.check.js`**

```js
import assert from "node:assert/strict";
import { placesForContinent } from "../adventure.js";

const landmarks = [
  { id: "ny", continent: "Americas", lat: 40 },
  { id: "lima", continent: "Americas", lat: -12 },
  { id: "paris", continent: "Europe", lat: 48 },
];
const wonders = [
  { id: "grandcanyon", continent: "Americas", lat: 36 },
  { id: "patagonia", continent: "Americas", lat: -50 },
  { id: "alps", continent: "Europe", lat: 46 },
];

assert.deepEqual(
  placesForContinent("northamerica", landmarks, wonders).map((p) => p.id),
  ["ny", "grandcanyon"]
);
assert.deepEqual(
  placesForContinent("southamerica", landmarks, wonders).map((p) => p.id),
  ["lima", "patagonia"]
);
assert.deepEqual(
  placesForContinent("europe", landmarks, wonders).map((p) => p.id),
  ["paris", "alps"]
);
assert.deepEqual(placesForContinent("nope", landmarks, wonders), []);

console.log("adventure.check.js OK");
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node tests/adventure.check.js
```

- [ ] **Step 3: Implement `placesForContinent`**

Copy boot’s function, but take `landmarks` / `wonders` arrays instead of `DATASETS`:

```js
export function placesForContinent(continentId, landmarks, wonders) {
  const filterPack = (all) => {
    if (continentId === "northamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat >= 7);
    }
    if (continentId === "southamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat < 7);
    }
    const label = {
      africa: "Africa",
      asia: "Asia",
      europe: "Europe",
      oceania: "Oceania",
      antarctica: "Antarctica",
    }[continentId];
    if (!label) return [];
    return all.filter((l) => l.continent === label);
  };
  return [...filterPack(landmarks || []), ...filterPack(wonders || [])];
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
node tests/adventure.check.js
```

- [ ] **Step 5: Commit**

```bash
git add adventure.js tests/adventure.check.js
git commit -m "$(cat <<'EOF'
feat(adventure): extract Continent join from boot

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 8: Adventure navigation module

**Files:**
- Modify: `adventure.js`
- Modify: `boot.js`
- Modify: `tests/adventure.check.js`

**Interfaces:**
- Consumes: `placesForContinent`; `findGame.stop`; `spaceMode.enter/leave`; `diveMs`
- Produces: `createAdventure(opts)`:

```js
{
  switchTab: (tab: string) => void,
  showPlacesInContinent: (place: object) => void,
  buildStrip: () => void,
  syncStrip: () => void,
  scrollStripToId: (id: string) => void,
  getTab: () => string,
  getPlaces: () => object[],
  getSelectedId: () => string|null,
  setSelectedId: (id: string|null) => void,
  getLandmarkFilter: () => string|null,
}
```

Move from boot: `DATASETS` can stay in boot and be passed in as `opts.datasets`. Move `activeTab`, `places`, `selectedId`, `landmarkFilter`, `buildStrip`, `syncStrip`, `scrollStripToId`, `switchTab`, `showPlacesInContinent`, `staggerPinPlaces`.

`createAdventure` must not import Globe internals — `opts.getGlobe()` / `opts.globeSetPlaces(items)`.

Strip click still calls `opts.onOpenPlace(id, btn)`.

CardMedia `placesForContinent` injection becomes:

```js
(id) => placesForContinent(id, opts.datasets.landmarks.items, opts.datasets.wonders.items)
```

- [ ] **Step 1: Add a tab-pool test** (append to `tests/adventure.check.js`, keep Task 7 asserts)

```js
function fakeClassList() {
  const s = new Set();
  return {
    add: (c) => s.add(c),
    remove: (c) => s.delete(c),
    contains: (c) => s.has(c),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
  };
}
function fakeEl() {
  return { hidden: true, textContent: "", classList: fakeClassList(), setAttribute() {}, innerHTML: "" };
}

const datasets = {
  landmarks: { items: [{ id: "eiffel", lat: 1, lng: 1 }], label: "L", hint: "", main: "landmarks" },
  wonders: { items: [{ id: "fuji", lat: 2, lng: 2 }], label: "W", hint: "", main: "wonders" },
  continents: { items: [], label: "C", hint: "", main: "continents" },
  countries: { items: [], label: "K", hint: "", main: "countries" },
  space: { items: [{ id: "mars", kind: "planet" }], label: "S", hint: "", main: "space" },
};
let stopped = 0;
const adventure = createAdventure({
  datasets,
  els: {
    tabLandmarks: fakeEl(),
    tabWonders: fakeEl(),
    tabContinents: fakeEl(),
    tabCountries: fakeEl(),
    tabSpace: fakeEl(),
    exploreLabel: fakeEl(),
    brandHint: fakeEl(),
    settingsPanel: fakeEl(),
    settingsBtn: fakeEl(),
    strip: null,
  },
  getGlobe: () => null,
  card: { close() {} },
  stopFind: () => { stopped += 1; },
  spaceEnter() {},
  spaceLeave() { return Promise.resolve(); },
  diveMs: () => 400,
  setAmbient() {},
  playPop() {},
  setPanelOpen() {},
  onOpenPlace() {},
  hideStickers() {},
});

assert.equal(adventure.getTab(), "landmarks");
adventure.switchTab("wonders");
assert.equal(adventure.getTab(), "wonders");
assert.equal(adventure.getPlaces()[0].id, "fuji");
assert.ok(stopped >= 1);
const before = adventure.getTab();
adventure.switchTab("nope");
assert.equal(adventure.getTab(), before);
```

- [ ] **Step 2: Run — expect FAIL on `createAdventure`**

```bash
node tests/adventure.check.js
```

- [ ] **Step 3: Implement `createAdventure` and wire boot**

Boot:

```js
const adventure = createAdventure({
  datasets: DATASETS,
  els,
  getGlobe: () => globe,
  card,
  stopFind: () => findGame.stop(),
  spaceEnter: () => spaceMode.enter(),
  spaceLeave: () => spaceMode.leave(),
  diveMs,
  setAmbient: setAmbientForMode,
  playPop,
  setPanelOpen,
  onOpenPlace: (id, el) => openLandmark(id, el),
  hideStickers: () => findGame.hideStickers(),
});
```

Replace `activeTab` reads with `adventure.getTab()`, `places` with `adventure.getPlaces()`, `selectedId` with get/set. Tab button listeners: `adventure.switchTab("landmarks")` etc.

`findGame` `getTab`/`getPlaces` should call adventure (construct adventure after findGame only if you pass closures — closures can call `adventure.getTab()` after both exist if `let adventure` is declared first:

```js
let adventure;
const findGame = createFindGame({ getTab: () => adventure.getTab(), getPlaces: () => adventure.getPlaces(), ... });
adventure = createAdventure({ ... });
```

Initialize adventure before `findGame.start` can run.

- [ ] **Step 4: Run checks**

```bash
node tests/adventure.check.js
node tests/find-game.check.js
node tests/space-mode.check.js
```

- [ ] **Step 5: Commit**

```bash
git add adventure.js boot.js tests/adventure.check.js
git commit -m "$(cat <<'EOF'
feat(adventure): peel tab pool and Continent join out of boot

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 9: Thin `openLandmark`

**Files:**
- Modify: `boot.js`

**Interfaces:**
- Consumes: `findGame.handlePinTap`, `adventure.getPlaces/setSelectedId/syncStrip/scrollStripToId/getTab`, `spaceMode.highlight`
- Produces: no new module

`openLandmark` stays in boot. After Tasks 4–8 it should only:

1. Ask Find quiz to handle the tap; return on wrong; set `skipFly` on correct
2. ISS early return
3. Resolve Place from `adventure.getPlaces()`
4. `adventure.setSelectedId`, pin/sizes selected class, `spaceMode.highlight(id)`
5. Sound/Speak/Luna
6. Space tab: delayed `card.openPlaceCard`
7. Earth: weather + `pointOfView` + delayed card
8. `adventure.scrollStripToId(id)`

Delete leftover locals (`findQuiz`, `Solar3D`, `resumeFindAfterCard`). If `openLandmark` still references `activeTab` / `places` / `selectedId` directly, those are bugs — use adventure.

- [ ] **Step 1: Grep boot for leaked names**

```bash
rg -n "findQuiz|findTargetPlace|resumeFindAfterCard|enterSpaceMode|leaveSpaceMode|placesForContinent\(|let activeTab|let places |let selectedId" boot.js
```

Expected: no matches (or only comments).

- [ ] **Step 2: Run the full check suite**

```bash
node tests/orbit-look.check.js
node tests/space-catalog.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/find-game.check.js
node tests/place-weather.check.js
node tests/traveler-orbit.check.js
node tests/space-mode.check.js
node tests/adventure.check.js
```

Expected: every file prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add boot.js
git commit -m "$(cat <<'EOF'
refactor(boot): thin Place selection now that Find and adventure own their seams

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 10: Sound `ambientKind`

**Files:**
- Modify: `sound.js`
- Create: `tests/sound.check.js`
- Modify: `boot.js` (and `adventure.js` / `space-mode.js` if they call `setAmbientForMode`)

**Interfaces:**
- Consumes: none
- Produces: `ambientKind(tab, selectedId) => 'on' | 'duck'` and `setAmbientForMode(kind)` (string, not `{ activeTab, selectedId }`)

Rule (today’s behaviour): `'on'` when `tab === "space"` or `selectedId` is truthy; otherwise `'duck'`.

- [ ] **Step 1: Write `tests/sound.check.js`**

```js
import assert from "node:assert/strict";
import { ambientKind } from "../sound.js";

assert.equal(ambientKind("space", null), "on");
assert.equal(ambientKind("landmarks", "eiffel"), "on");
assert.equal(ambientKind("landmarks", null), "duck");
assert.equal(ambientKind("wonders", ""), "duck");

console.log("sound.check.js OK");
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node tests/sound.check.js
```

- [ ] **Step 3: Implement and switch callers**

```js
export function ambientKind(tab, selectedId) {
  if (tab === "space" || selectedId) return "on";
  return "duck";
}
```

Inside `createSound`, change:

```js
function setAmbientForMode(kind) {
  if (!soundOn) {
    stopAmbient();
    return;
  }
  if (kind === "on") startAmbient();
  else if (ambientNodes && ambientNodes.master) {
    ambientNodes.master.gain.setTargetAtTime(0.028, audioCtx.currentTime, 0.4);
  } else {
    startAmbient();
  }
}
```

Boot helper becomes:

```js
function setAmbientForMode() {
  sound.setAmbientForMode(ambientKind(adventure.getTab(), adventure.getSelectedId()));
}
```

Import `ambientKind` from `sound.js`. No caller may pass `{ activeTab, selectedId }`.

- [ ] **Step 4: Run**

```bash
node tests/sound.check.js
node tests/adventure.check.js
```

- [ ] **Step 5: Commit**

```bash
git add sound.js tests/sound.check.js boot.js adventure.js space-mode.js
git commit -m "$(cat <<'EOF'
refactor(sound): map ambient from kind, not adventure tabs

EOF
)"
```

Then `graphify update .` with `all` permissions.

---

### Task 11: Verify

**Files:** none new

- [ ] **Step 1: Run every check**

```bash
node tests/orbit-look.check.js
node tests/space-catalog.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/find-game.check.js
node tests/place-weather.check.js
node tests/traveler-orbit.check.js
node tests/space-mode.check.js
node tests/adventure.check.js
node tests/sound.check.js
```

Expected: ten `OK` lines, exit 0.

- [ ] **Step 2: Graphify**

```bash
graphify update .
```

Shell must use `required_permissions: ["all"]`. Expected: rebuild succeeds (on the order of hundreds of nodes, not thousands of vendor nodes).

- [ ] **Step 3: Manual smoke (human)**

Landmarks find round → card → auto resume; wrong pin shake; space tab find (planets not ISS); pinch to space; continent Explore here (Americas N/S); mute then select a Place (no ambient).

No commit unless something broke and needed a fix.

---

## What this plan deliberately skips

- Luna / sparkles / night chrome — deletion test failed; leave in boot
- Deepening `quiz.js` in place without `find-game.js` — interface would stay as wide as the implementation
- A `selection.js` module — `openLandmark` thins in place
- Recreating `chrome.js`
- jsdom, bundler, TypeScript
