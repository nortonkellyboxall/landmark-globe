# Place module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give Place a typed owner, load content packs as ES modules, and stop `boot.js` from owning tab datasets and Place lookup.

**Architecture:** `place.js` owns the Place JSDoc typedef, re-exports earth packs, and `placeById` / `allPlaces`. Content packs stay shallow arrays but `export const` instead of `window.*`. Adventure navigation owns `DATASETS` (tab → pool + chrome labels) and defaults to those packs so boot only wires. Space bodies stay in `space-catalog.js`; Place lookup includes them. No bundler, no JSON import attributes (Safari/phone; `geography.js` holds two arrays).

**Tech Stack:** Vanilla JS ES modules, existing importmap, Node `assert` self-checks (no test runner, no jsdom, no new deps).

## Global Constraints

- No bundler / no root `package.json` / no new npm dependencies
- Do not rebuild globe.gl / dual Three / merge `toy.css` into `app.css` / recreate `chrome.js` or add `selection.js`
- ADR 0002: quiz rules stay out of Globe and CardMedia
- Content packs stay shallow arrays (`landmarks.js`, `wonders.js`, `geography.js`); only the load mechanism changes (`export const`, not `window.*`)
- Do not convert packs to `.json` — ES module exports work in the browser and in `node`/`bake-speech` without import attributes
- Node assert checks only — fake `els` when DOM would be needed
- After code tasks: `graphify update .` with Shell `required_permissions: ["all"]`. Use `--force` if shrink-guard fires
- Do not commit unless the human asks

## File map

| File | Responsibility |
|------|----------------|
| `place.js` | Place typedef, re-export earth packs, `placeById(id)`, `allPlaces()` |
| `landmarks.js` | `export const LANDMARKS` (was `window.LANDMARKS`) |
| `wonders.js` | `export const WONDERS` |
| `geography.js` | `export const CONTINENTS`, `export const COUNTRIES` |
| `adventure.js` | Owns `DATASETS`; `createAdventure` defaults to it when `opts.datasets` omitted |
| `boot.js` | Drop `DATASETS` and local `placeById`; import lookup + packs; pass no datasets |
| `index.html` | Drop classic `<script>` tags for the three pack files |
| `scripts/bake-speech.mjs` | Load places via `allPlaces()` instead of `Function("window")` |
| `CONTEXT.md` | Place + content-pack glossary: `continent`, ES modules |
| `tests/place.check.js` | Pack exports, `placeById`, `allPlaces` |
| `tests/adventure.check.js` | Default `DATASETS` uses `LANDMARKS` |

Do **not** create: `selection.js`, `chrome.js`, JSON pack files, a Place class, a registry framework.

---

### Task 1: Content packs as ES modules

**Files:**
- Modify: `landmarks.js:1` (`window.LANDMARKS` → `export const LANDMARKS`)
- Modify: `wonders.js:1` (`window.WONDERS` → `export const WONDERS`)
- Modify: `geography.js:1` and `geography.js:138` (`window.CONTINENTS` / `window.COUNTRIES` → `export const`)
- Test: `tests/place.check.js` (create; this task only the pack-export asserts)

**Interfaces:**
- Consumes: existing array literals in those three files (do not rewrite rows)
- Produces: `export const LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`

- [x] **Step 1: Write the failing pack-export asserts**

Create `tests/place.check.js`:

```js
import assert from "node:assert/strict";
import { LANDMARKS } from "../landmarks.js";
import { WONDERS } from "../wonders.js";
import { CONTINENTS, COUNTRIES } from "../geography.js";

assert.ok(LANDMARKS.find((p) => p.id === "eiffel"));
assert.ok(WONDERS.find((p) => p.id === "grandcanyon"));
assert.ok(CONTINENTS.find((p) => p.id === "africa"));
assert.ok(COUNTRIES.find((p) => p.id === "usa"));

console.log("place.check.js OK");
```

- [x] **Step 2: Run it — expect RED**

Run: `node tests/place.check.js`

Expected: fail (no named export and/or `window is not defined`).

- [x] **Step 3: Switch the four assignments to `export const`**

First line of `landmarks.js`: `export const LANDMARKS = [`
First line of `wonders.js`: `export const WONDERS = [`
`geography.js` line 1: `export const CONTINENTS = [`
`geography.js` `window.COUNTRIES = [` → `export const COUNTRIES = [`

Do not touch array bodies.

- [x] **Step 4: Re-run — expect GREEN**

Run: `node tests/place.check.js`

Expected: `place.check.js OK`, exit 0.

---

### Task 2: Place typedef + lookup

**Files:**
- Create: `place.js`
- Modify: `tests/place.check.js` (add `placeById` / `allPlaces` asserts)
- Modify: `CONTEXT.md` Place and Content pack bullets

**Interfaces:**
- Consumes: pack exports from Task 1; `SPACE_BODIES` from `space-catalog.js`
- Produces:

```js
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
export { LANDMARKS } from "./landmarks.js";
export { WONDERS } from "./wonders.js";
export { CONTINENTS, COUNTRIES } from "./geography.js";
/** @param {string} id @returns {Place | null} */
export function placeById(id) {}
/** @returns {Place[]} */
export function allPlaces() {}
```

Lookup order (same as today's `Object.keys(DATASETS)`): landmarks, wonders, continents, countries, space. First id wins.

- [x] **Step 1: Add failing lookup asserts to `tests/place.check.js`**

Keep the pack imports. Add:

```js
import { placeById, allPlaces } from "../place.js";

assert.equal(placeById("eiffel")?.name, "Eiffel Tower");
assert.equal(placeById("grandcanyon")?.name, "Grand Canyon");
assert.equal(placeById("africa")?.kind, "continent");
assert.equal(placeById("usa")?.kind, "country");
assert.equal(placeById("mars")?.name, "Mars");
assert.equal(placeById("nope"), null);

const ids = allPlaces().map((p) => p.id);
assert.ok(ids.includes("eiffel"));
assert.ok(ids.includes("mars"));
assert.equal(new Set(ids).size, ids.length);
```

- [x] **Step 2: Run — expect RED**

Run: `node tests/place.check.js`

Expected: fail (`place.js` missing or no `placeById` export).

- [x] **Step 3: Minimal `place.js`**

```js
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
```

- [x] **Step 4: Re-run — expect GREEN**

Run: `node tests/place.check.js`

Expected: `place.check.js OK`, exit 0.

- [x] **Step 5: Glossary**

In `CONTEXT.md`, replace the Place and Content pack bullets with:

```markdown
- **Place** — A kid-facing record shown on the globe or in space (landmark, wonder, continent, country, or space body). Shape is the JSDoc typedef in `place.js`: `id`, `name`, optional `place`, `story`, `wow`, `photos`, `lat`/`lng`, `video`, `anthem`, `emoji`, `color`, `kind`, `continent`. Lookup: `placeById` / `allPlaces`. Space bodies may carry extra SpaceCatalog fields (`au`, `visual`, …); views still must not own body data.
- **Content pack** — Shallow ES-module array (`LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`). Re-exported from `place.js`. Not deepened.
```

---

### Task 3: Move DATASETS out of boot (named seam = Adventure navigation)

**Files:**
- Modify: `adventure.js` (import packs, export `DATASETS`, default in `createAdventure`)
- Modify: `boot.js` (delete `DATASETS` and local `placeById`; wire imports)
- Modify: `tests/adventure.check.js` (assert default `DATASETS` uses `LANDMARKS`)
- Modify: `index.html` (remove pack `<script>` tags)
- Modify: `scripts/bake-speech.mjs` (use `allPlaces()`)

**Interfaces:**
- Consumes: Task 2 `place.js`; existing `createAdventure({ datasets })`
- Produces: `export const DATASETS` on `adventure.js`; `createAdventure` uses `opts.datasets || DATASETS`; boot does not mention `DATASETS`

`DATASETS` chrome strings stay exactly:

```js
landmarks: { label: "🏛️ Landmarks", hint: "", main: "landmarks" }
wonders: { label: "🌋 Natural wonders", hint: "Nature’s wow places", main: "wonders" }
continents: { label: "🌍 Continents", hint: "Earth’s giant pieces", main: "continents" }
countries: { label: "🚩 Countries", hint: "Countries around the world", main: "countries" }
space: { label: "🚀 Space", hint: "Meet the planets", main: "space" }
```

with `items` pointing at `LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`, `SPACE_BODIES`.

- [x] **Step 1: Failing default-DATASETS assert**

At the top of `tests/adventure.check.js`, add imports and, **after** the existing fake-`datasets` tests (those must keep passing with an explicit `datasets` option):

```js
import { LANDMARKS } from "../landmarks.js";
import { placesForContinent, createAdventure, DATASETS } from "../adventure.js";

assert.equal(DATASETS.landmarks.items, LANDMARKS);
assert.equal(DATASETS.space.main, "space");
```

Keep the existing `from "../adventure.js"` import as a single combined import.

- [x] **Step 2: Run — expect RED**

Run: `node tests/adventure.check.js`

Expected: fail (`DATASETS` is not exported).

- [x] **Step 3: Add `DATASETS` + default in `adventure.js`**

Add at top of `adventure.js` (after existing `placesForContinent` is fine; imports must be first):

```js
import { LANDMARKS, WONDERS, CONTINENTS, COUNTRIES } from "./place.js";
import { SPACE_BODIES } from "./space-catalog.js";

/** @type {Record<string, { items: import("./place.js").Place[], label: string, hint: string, main: string }>} */
export const DATASETS = {
  landmarks: {
    items: LANDMARKS,
    label: "🏛️ Landmarks",
    hint: "",
    main: "landmarks",
  },
  wonders: {
    items: WONDERS,
    label: "🌋 Natural wonders",
    hint: "Nature’s wow places",
    main: "wonders",
  },
  continents: {
    items: CONTINENTS,
    label: "🌍 Continents",
    hint: "Earth’s giant pieces",
    main: "continents",
  },
  countries: {
    items: COUNTRIES,
    label: "🚩 Countries",
    hint: "Countries around the world",
    main: "countries",
  },
  space: {
    items: SPACE_BODIES,
    label: "🚀 Space",
    hint: "Meet the planets",
    main: "space",
  },
};
```

Change `createAdventure` JSDoc `datasets:` to `datasets?:`. Inside the factory:

```js
const datasets = opts.datasets || DATASETS;
```

- [x] **Step 4: Re-run adventure check — expect GREEN**

Run: `node tests/adventure.check.js`

Expected: `adventure.check.js OK`, exit 0.

- [x] **Step 5: Thin `boot.js`**

- Add: `import { LANDMARKS, WONDERS, placeById } from "./place.js";`
- Keep: `SPACE_BODIES` import from `space-catalog.js` if still needed; if the only boot use was `DATASETS.space.items`, switch `getSpaceItems` to `() => SPACE_BODIES` and drop `SPACE_BODIES` from boot if unused.
- Delete the whole `const DATASETS = { ... };` block.
- Delete local `function placeById`.
- CardMedia `placesForContinent`: `continentPlaces(id, LANDMARKS, WONDERS)`.
- `createSpaceMode({ getSpaceItems: () => SPACE_BODIES, ...})`.
- `createAdventure({ ... })` — omit `datasets`.
- `lookupPlace: placeById` on find-game stays, now the imported function.

- [x] **Step 6: `index.html`**

Remove these three tags; keep importmap, globe.gl, boot module:

```html
<script src="landmarks.js"></script>
<script src="wonders.js"></script>
<script src="geography.js"></script>
```

- [x] **Step 7: `scripts/bake-speech.mjs`**

Delete `loadWindowArray`. Replace the `places` concat with:

```js
const { allPlaces } = await import(pathToFileURL(join(root, "place.js")).href);
const places = allPlaces();
```

Delete `loadSpaceBodies` if it exists only for that concat. Keep `pathToFileURL` / `root` as they are.

- [x] **Step 8: Full checks**

Run:

```bash
node tests/place.check.js
node tests/adventure.check.js
node tests/orbit-look.check.js
node tests/space-catalog.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/find-game.check.js
node tests/place-weather.check.js
node tests/traveler-orbit.check.js
node tests/space-mode.check.js
node tests/sound.check.js
node tests/card-media.check.js
node tests/moon-phases.check.js
node tests/speak-phase.check.js
```

Expected: each prints `*.check.js OK`, exit 0.

- [x] **Step 9: graphify**

Run: `graphify update .` with `required_permissions: ["all"]`. `--force` only if shrink-guard fires.

---

## Out of scope

- React / Vite / Bun / React Three Fiber
- A third 3D view or view-router
- TypeScript, `jsconfig.json`, runtime Place validation
- Splitting `geography.js` into two files
