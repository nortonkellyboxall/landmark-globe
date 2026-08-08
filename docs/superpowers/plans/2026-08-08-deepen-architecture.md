# Deepen Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen landmark-globe so solar-system truth has one owner, and behaviour peels out of the `index.html` god-file behind small module interfaces (SpaceCatalog, CardMedia, Globe, Sound, Chrome) while leaving content packs shallow.

**Architecture:** Static ES modules via existing importmap (no bundler, no new deps). `space-catalog.js` is the single SpaceCatalog source; view adapters (`solar3d.js`, orbit/sizes DOM builders) only consume it. App behaviour moves into focused modules; `index.html` becomes shell markup + script tags + thin boot. Data packs stay `window.*` globals.

**Tech Stack:** Vanilla JS ES modules, Three.js (existing vendor/importmap), globe.gl (existing), Node assert self-checks (no test runner).

## Global Constraints

- No bundler / no `package.json` / no new npm dependencies
- ES modules + importmap only (match `solar3d.js` pattern)
- Leave `landmarks.js`, `wonders.js`, `geography.js` as dumb `window.*` arrays
- Commit on branch `feature/deepen-architecture` after each task
- One runnable Node assert check for SpaceCatalog pure logic
- Preserve kid-facing UX (orbits, sizes, 3D, cards, night, mute, tabs)
- Use domain terms from `CONTEXT.md` once it exists
- Do not deepen data bags (candidate #5 = leave shallow)

## File map

| File | Responsibility |
|------|----------------|
| `CONTEXT.md` | Domain glossary: Place, SpaceCatalog, Globe, CardMedia, Sound |
| `space-catalog.js` | Deep SpaceCatalog — stories + AU/years/diameters + 3D visual params + pure orbit helpers |
| `tests/space-catalog.check.js` | Node assert self-check for catalog + orbit math |
| `solar3d.js` | Solar3DView adapter — consumes catalog; no local BODY_DEFS/LABELS |
| `space-dom.js` | OrbitDomView + SizesDomView builders (or stay in space-mode until peel) |
| `card-media.js` | CardMedia module |
| `globe-app.js` | Globe module adapter over globe.gl |
| `sound.js` | Sound module |
| `chrome.js` | Chrome menus/tabs helpers |
| `boot.js` | Wire datasets, modules, event listeners; call init |
| `app.css` | All styles peeled from `index.html` |
| `index.html` | Markup + importmap + script tags only |
| Delete | `space.js` (replaced by catalog) |

---

### Task 1: Branch + CONTEXT.md

**Files:**
- Create: `CONTEXT.md`
- Modify: none yet (branch only)

**Interfaces:**
- Produces: domain terms for later tasks

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/deepen-architecture
```

- [ ] **Step 2: Write CONTEXT.md**

```markdown
# Domain context

## Glossary

- **Place** — A kid-facing record shown on the globe or in space (landmark, wonder, continent, country, or space body). Informal shape: `id`, `name`, `place`, `story`, `wow`, `photos`, optional `lat`/`lng`, `video`, `anthem`, `emoji`, `color`, `kind`.
- **SpaceCatalog** — Single source of truth for solar-system bodies: kid copy plus AU, orbital years, diameters, and 3D visual params. Views only render; they do not own body data.
- **Globe** — Earth view module: pins, night mode, camera. Callers use a small interface; they never touch globe.gl materials/scene directly.
- **CardMedia** — Place detail card: gallery, video/anthem, speech. Selection/fly-to stays outside.
- **Sound** — Ambient audio, whoosh, mute. WebAudio details stay inside the module.
- **Content pack** — Shallow `window.*` array file (`LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`). Not deepened.
```

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: add domain glossary for architecture deepen"
```

Then run `graphify . --update` (or code-only path if LLM key missing).

---

### Task 2: SpaceCatalog module + self-check

**Files:**
- Create: `space-catalog.js`
- Create: `tests/space-catalog.check.js`
- Delete: `space.js` (after wire)
- Modify: `solar3d.js` (consume catalog)
- Modify: `index.html` (drop ORBIT_*/SPACE_DIAMETERS; import catalog; remove `space.js` script tag; DATASETS.space from catalog)

**Interfaces:**
- Produces:
  - `export const SPACE_BODIES` — array of Place records enriched with `au?`, `orbitYears?`, `visual` (`{ size, colorHex, orbit?, speed?, style?, parent?, rings?, eccentricity? }`)
  - `export const EARTH_YEAR_SECONDS = 22`
  - `export function getBody(id)`
  - `export function diameterKm(bodyOrId)`
  - `export function orbitRadiusPct(au)`
  - `export function orbitSpinSeconds(years)`
  - `export const SPACE_VIEW_HINTS`
- Consumes: none

**Body visual params** (from current `BODY_DEFS` in `solar3d.js`) — merge into each body on the catalog:

| id | visual fields |
|----|---------------|
| sun | size 7.5, colorHex 0xffb703, emissive 0xff8c00, style sun |
| mercury | size 1.35, colorHex 0xd0c8be, orbit 12, speed 1.6, style rocky |
| venus | size 1.85, colorHex 0xf4d35e, orbit 16, speed 1.15, style cloudy |
| earth | size 2.0, colorHex 0x4cc9f0, orbit 20.5, speed 1.0, style earth |
| moon | size 0.85, colorHex 0xeeeeee, parent earth, orbit 3.4, speed 3.2, style rocky |
| mars | size 1.55, colorHex 0xf2845c, orbit 25, speed 0.8, style rocky |
| asteroids | kind belt, orbit 29 (no mesh size) |
| jupiter | size 4.6, colorHex 0xf4a261, orbit 35, speed 0.42, style gas |
| saturn | size 4.0, colorHex 0xf1d06b, orbit 43, speed 0.32, rings true, style gas |
| uranus | size 2.8, colorHex 0x90e0ef, orbit 50, speed 0.22, style ice |
| neptune | size 2.7, colorHex 0x5b8cff, orbit 56, speed 0.18, style ice |
| comet | size 1.1, colorHex 0xd8f3ff, orbit 62, speed 0.12, eccentricity 0.55, style ice |

**AU / years** (from `index.html` ORBIT_AU / ORBIT_YEARS) — fields on bodies:

- au: mercury 0.39, venus 0.72, earth 1, mars 1.52, asteroids 2.7, jupiter 5.2, saturn 9.58, uranus 19.2, neptune 30.05, comet 17
- orbitYears: mercury 0.241, venus 0.615, earth 1, mars 1.881, asteroids 4.6, jupiter 11.86, saturn 29.46, uranus 84, neptune 164.8, comet 75, moon 0.075

Keep existing kid fields from `space.js` (`name`, `place`, `emoji`, `color` CSS string, `story`, `wow`, `photos`, `video`, `diameterKm`, `kind`, display `size` for 2D).

- [ ] **Step 1: Write failing self-check**

```js
// tests/space-catalog.check.js
import assert from "node:assert/strict";
import {
  SPACE_BODIES,
  getBody,
  diameterKm,
  orbitRadiusPct,
  orbitSpinSeconds,
  EARTH_YEAR_SECONDS,
} from "../space-catalog.js";

assert.equal(SPACE_BODIES.length, 12);
assert.equal(getBody("earth").au, 1);
assert.equal(diameterKm("jupiter"), 139820);
assert.equal(diameterKm(getBody("earth")), 12742);
assert.ok(orbitRadiusPct(0.39) < orbitRadiusPct(30.05));
assert.equal(orbitSpinSeconds(1), Math.max(3.5, EARTH_YEAR_SECONDS));
assert.equal(getBody("mercury").visual.orbit, 12);
assert.equal(getBody("moon").visual.parent, "earth");
console.log("space-catalog.check.js OK");
```

- [ ] **Step 2: Run check — expect FAIL (module missing)**

```bash
node tests/space-catalog.check.js
```

Expected: ERR_MODULE_NOT_FOUND

- [ ] **Step 3: Implement `space-catalog.js`**

Move all `space.js` Place records into `SPACE_BODIES`, attach `au` / `orbitYears` / `visual` per tables above. Implement helpers exactly as in current `index.html`:

```js
export const EARTH_YEAR_SECONDS = 22;

export function orbitRadiusPct(au) {
  const s = Math.sqrt(au);
  const min = Math.sqrt(0.39);
  const max = Math.sqrt(30.05);
  const t = (s - min) / (max - min);
  return 16 + t * 80;
}

export function orbitSpinSeconds(years) {
  return Math.max(3.5, EARTH_YEAR_SECONDS * years);
}

export function getBody(id) {
  return SPACE_BODIES.find((b) => b.id === id) || null;
}

export function diameterKm(bodyOrId) {
  const body = typeof bodyOrId === "string" ? getBody(bodyOrId) : bodyOrId;
  return (body && body.diameterKm) || 1000;
}

export const SPACE_VIEW_HINTS = {
  orbits: "Top-down map · distances & year lengths are real (sped up)",
  sizes: "Scroll to compare real sizes!",
  spheres: "Drag to look around · scroll/pinch to zoom · tap a planet",
};
```

Also export `labelName(body)` = `body.name.replace(/^The /, "")` for 3D labels.

- [ ] **Step 4: Run check — expect PASS**

```bash
node tests/space-catalog.check.js
```

Expected: `space-catalog.check.js OK`

- [ ] **Step 5: Refactor `solar3d.js` to import catalog**

- Remove `BODY_DEFS` and `LABELS`
- `import { SPACE_BODIES, getBody, labelName } from "./space-catalog.js"`
- Build meshes from `SPACE_BODIES` using `body.visual` (+ `body.id`, `body.kind`)
- Labels via `labelName(body)` or `body.name`
- Keep `window.Solar3D = { init, destroy, resize, setActive, highlight, playIntroZoom }` facade
- `init(container, opts)` may accept optional `bodies` override; default `SPACE_BODIES`

- [ ] **Step 6: Wire `index.html` space section**

- Remove `<script src="space.js">`
- In IIFE (still inline for now): dynamic `import("./space-catalog.js")` at boot OR add `type="module"` boot later; for this task, use:

```html
<script type="module">
  import { SPACE_BODIES } from "./space-catalog.js";
  window.__SPACE_CATALOG__ = SPACE_BODIES;
  window.dispatchEvent(new Event("space-catalog-ready"));
</script>
```

Simpler approach for this task (preferred): make the main IIFE a `type="module"` script that imports catalog — **only if** you can keep globe.gl globals working (classic scripts before module). Order:

1. classic: globe.gl, landmarks, wonders, geography
2. module IIFE imports catalog + uses `window.LANDMARKS` etc.

If converting whole IIFE to module is too large for this task: keep IIFE classic and bridge:

```js
// at top of solar/space section after catalog bridge loaded
const SPACE_ITEMS = window.__SPACE_CATALOG__ || [];
```

Set `DATASETS.space.items` from catalog array. Delete `ORBIT_AU`, `ORBIT_YEARS`, `SPACE_DIAMETERS`. Import helpers from catalog via the bridge (`window.__SPACE_HELPERS__ = { orbitRadiusPct, ... }`) **or** convert space builders into a small `space-dom.js` module imported by a thin module script.

**Preferred minimal for Task 2:** create `space-dom.js` exporting `buildOrbitView(ctx)` and `buildSizesView(ctx)` that import catalog helpers; classic IIFE calls them after dynamic import. Delete duplicate constants from index.

- [ ] **Step 7: Delete `space.js`**

- [ ] **Step 8: Manual smoke** — open `index.html`, Space tab: spheres/sizes/orbits + card open still work.

- [ ] **Step 9: Commit**

```bash
git add space-catalog.js tests/space-catalog.check.js solar3d.js index.html space-dom.js
git rm space.js
git commit -m "feat(space): unify SpaceCatalog as single body source"
```

---

### Task 3: CardMedia module

**Files:**
- Create: `card-media.js`
- Modify: `index.html` (replace openCard/gallery/video/anthem/speak internals with module calls)

**Interfaces:**
- Consumes: DOM els for card; Place record
- Produces:

```js
export function createCardMedia(els, deps) {
  // deps: { speakEnabled?, onSpeak?, sparkAt? } — only what card needs
  return {
    openPlaceCard(place),
    close(),
    speak(place),
  };
}
```

Move from `index.html` (~2428–2699 and gallery helpers ~2320–2426 as needed): `openCard`, `buildGallery`, `goToPhoto`, `showMediaPanel`, `playVideoEmbed`, anthem helpers, speak button wiring internals.

`openLandmark` stays in boot/orchestrator: find place → fly/highlight → `card.openPlaceCard(lm)`.

- [ ] **Step 1: Extract `card-media.js` with interface above** — cut/paste behaviour; keep visuals identical
- [ ] **Step 2: Wire from IIFE/boot** — construct once; replace call sites
- [ ] **Step 3: Smoke** — open landmark, swipe photos, watch/anthem, hear, close
- [ ] **Step 4: Commit** `feat(card): peel CardMedia module behind small interface`

---

### Task 4: Globe module

**Files:**
- Create: `globe-app.js`
- Modify: `index.html` / boot — `initGlobe`, `applyNightMode`, `createPin`, `setGlobeEngineActive`, pin updates on tab switch

**Interfaces:**

```js
export function createGlobe(el, opts) {
  // opts: { textures?, onSelect(id) }
  return {
    setPlaces(places),
    setNight(on),
    setActive(active),
    pointOfView(lat, lng, altitude, ms),
    destroy(),
  };
}
```

Implementation owns globe.gl instance, THREE lights, clouds, materials. Callers never call `globeMaterial()` / `scene()`.

- [ ] **Step 1: Extract `globe-app.js`**
- [ ] **Step 2: Replace call sites in boot**
- [ ] **Step 3: Smoke** — pins, surprise, night toggle, space handoff hides/shows globe
- [ ] **Step 4: Commit** `feat(globe): peel Globe adapter over globe.gl`

---

### Task 5: Sound + Chrome modules

**Files:**
- Create: `sound.js`
- Create: `chrome.js`
- Modify: boot / index IIFE

**Interfaces:**

```js
// sound.js
export function createSound() {
  return {
    startAmbient(),
    stopAmbient(),
    setMuted(muted),
    playWhoosh(),
    tone(freq, dur),
  };
}

// chrome.js
export function createChrome(els) {
  return {
    setPanelOpen(open),
    closeChromeMenus(),
    // tab/subtab aria helpers used by boot
  };
}
```

- [ ] **Step 1: Extract sound.js from ambient/whoosh/mute block (~2110–2300)**
- [ ] **Step 2: Extract chrome.js from menu helpers**
- [ ] **Step 3: Smoke** — mute, ambient on space, settings panel
- [ ] **Step 4: Commit** `feat(app): peel Sound and Chrome modules`

---

### Task 6: app.css + boot.js + thin index.html

**Files:**
- Create: `app.css` (move all CSS from index `<style>`)
- Create: `boot.js` as `type="module"` — owns DATASETS wiring, module construction, listeners, `initGlobe`/space mode orchestration remaining
- Modify: `index.html` — markup only +:

```html
<link rel="stylesheet" href="app.css" />
<script src="vendor/globe.gl.min.js"></script>
<script src="landmarks.js"></script>
<script src="wonders.js"></script>
<script src="geography.js"></script>
<script type="importmap">…existing three map…</script>
<script type="module" src="boot.js"></script>
```

Remove inline IIFE and `<style>` block. Delete dead `buildIsoView` stub if still present.

- [ ] **Step 1: Peel CSS → `app.css`; link from index**
- [ ] **Step 2: Move remaining IIFE → `boot.js` as module; import CardMedia, Globe, Sound, Chrome, space-catalog, space-dom**
- [ ] **Step 3: Full smoke** — all four adventure tabs, geo subtabs, space subtabs, card, night, mute
- [ ] **Step 4: Commit** `refactor(app): thin index.html to shell with boot module`

---

### Task 7: Verify + leave data bags shallow

**Files:**
- Modify: `CONTEXT.md` only if terms drifted
- No changes to landmarks/wonders/geography content packs

- [ ] **Step 1: Run** `node tests/space-catalog.check.js` — PASS
- [ ] **Step 2: Confirm no `space.js`, no `BODY_DEFS`, no `ORBIT_AU` / `SPACE_DIAMETERS` left**

```bash
rg -n "BODY_DEFS|ORBIT_AU|SPACE_DIAMETERS|window\.SPACE|space\.js" --glob '!docs/**' .
```

Expected: no matches in app source (docs/plan may mention them)

- [ ] **Step 3: Commit only if docs tweaks** `docs: sync glossary after deepen`

---

## Self-review

1. Spec coverage: Space catalog ✅ · Peel IIFE ✅ · Globe ✅ · Card ✅ · Data bags leave shallow ✅ · CONTEXT ✅ · tests ✅
2. Placeholders: none intentional — Task 3–6 move existing code; implementers cut from current line ranges in `index.html`
3. Types: interfaces named consistently (`createGlobe`, `openPlaceCard`, `SPACE_BODIES`, `diameterKm`)

## Execution

User already requested implement-all. Use **subagent-driven-development**: fresh implementer per task, review between tasks, no pause for “continue?”.
