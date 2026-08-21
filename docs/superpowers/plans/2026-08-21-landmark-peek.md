# Landmark Peek Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Earth pin taps dive to a closer peek altitude and open the Place card only after the camera tween finishes.

**Architecture:** Pure `peekAltitudeForTab` in `orbit-look.js`. Globe `pointOfView` forwards `setEarthLook`'s Promise. `openLandmark` awaits that Promise (with a generation token so a newer tap cancels a stale card open).

**Tech Stack:** Vanilla ES modules, Node assert checks, existing Solar3D `setEarthLook` tween.

## Global Constraints

- No new WebGL meshes, bundler, or npm deps
- ADR 0002: quiz rules stay out of Globe
- Space / ISS / Find `skipFly` paths unchanged except Earth fly waits for dive
- Spec: `docs/superpowers/specs/2026-08-21-landmark-peek-design.md`

## File map

| File | Role |
|------|------|
| `orbit-look.js` | `peekAltitudeForTab(tab)` |
| `tests/orbit-look.check.js` | Assert peek altitudes |
| `globe-app.js` | `pointOfView` returns Promise from `setEarthLook` |
| `boot.js` | `openLandmark` card-after-dive + stale cancel |

---

### Task 1: `peekAltitudeForTab`

**Files:**
- Modify: `orbit-look.js`
- Modify: `tests/orbit-look.check.js`

**Interfaces:**
- Produces: `export function peekAltitudeForTab(tab: string): number`

- [ ] **Step 1: Write the failing asserts**

Append to `tests/orbit-look.check.js`:

```js
import { peekAltitudeForTab } from "../orbit-look.js";

assert.equal(peekAltitudeForTab("countries"), 0.95);
assert.equal(peekAltitudeForTab("continents"), 1.25);
assert.equal(peekAltitudeForTab("landmarks"), 1.05);
assert.equal(peekAltitudeForTab("wonders"), 1.05);
assert.equal(peekAltitudeForTab("space"), 1.05);
assert.equal(peekAltitudeForTab("nope"), 1.05);
```

- [ ] **Step 2: Run test — expect fail**

Run: `node tests/orbit-look.check.js`  
Expected: FAIL — `peekAltitudeForTab` not exported / not a function

- [ ] **Step 3: Implement**

In `orbit-look.js`:

```js
/** Closer Earth fly-to altitude for landmark peek dives. */
export function peekAltitudeForTab(tab) {
  if (tab === "countries") return 0.95;
  if (tab === "continents") return 1.25;
  return 1.05;
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `node tests/orbit-look.check.js`  
Expected: `orbit-look.check.js OK`

- [ ] **Step 5: Commit**

```bash
git add orbit-look.js tests/orbit-look.check.js
git commit -m "feat(orbit): add peekAltitudeForTab for landmark peeks"
```

---

### Task 2: Forward POV Promise from Globe

**Files:**
- Modify: `globe-app.js` (`pointOfView`)

**Interfaces:**
- Consumes: `Solar3D.setEarthLook(lat, lng, alt, ms) → Promise`
- Produces: `globe.pointOfView(lat, lng, alt, ms)` returns that Promise when setting; still returns POV object when called with no args

- [ ] **Step 1: Change `pointOfView` to return the tween Promise**

```js
function pointOfView(lat, lng, altitude, ms) {
  if (arguments.length === 0) return Solar3D.getEarthPov();
  if (ms > 400) pauseAutoRotateTemporarily(Math.max(4000, ms + 500));
  return Solar3D.setEarthLook(lat, lng, altitude, ms || 0);
}
```

- [ ] **Step 2: Smoke — no check file required**

Confirm `setEarthLook` already returns `Promise.resolve()` / `tweenCamera(...).then(...)`.

- [ ] **Step 3: Commit**

```bash
git add globe-app.js
git commit -m "fix(globe): return setEarthLook promise from pointOfView"
```

---

### Task 3: Card after dive in `openLandmark`

**Files:**
- Modify: `boot.js` (import + `openLandmark` Earth fly branch)

**Interfaces:**
- Consumes: `peekAltitudeForTab`, `diveMs`, `globe.pointOfView(...): Promise`
- Produces: card opens only after dive; stale dives do not open card

- [ ] **Step 1: Import helper**

```js
import { diveMs, firefliesShouldTick, heatHint, isDeepSpace, SPACE_HANDOFF_ALT, peekAltitudeForTab } from "./orbit-look.js";
```

- [ ] **Step 2: Add dive generation + await card open**

Near other module-level state in `boot.js`:

```js
let peekDiveGen = 0;
```

Replace the Earth fly branch (`if (skipFly) { ... } else { ... }`) with:

```js
  if (skipFly) {
    setTimeout(() => card.openPlaceCard(lm), 220);
  } else {
    const tab = adventure.getTab();
    const alt = peekAltitudeForTab(tab);
    const from = (globe.pointOfView() || {}).altitude;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : diveMs(from, alt);
    const gen = ++peekDiveGen;
    Promise.resolve(globe.pointOfView(lm.lat, lm.lng, alt, ms)).then(() => {
      if (gen !== peekDiveGen) return;
      card.openPlaceCard(lm);
    });
  }
```

Remove the mid-flight `setTimeout(..., Math.min(ms - 180, Math.max(420, ms * 0.62)))`.

- [ ] **Step 3: Run checks**

Run: `node tests/orbit-look.check.js && node tests/adventure.check.js && node tests/place.check.js`  
Expected: all OK

- [ ] **Step 4: Commit**

```bash
git add boot.js
git commit -m "feat(boot): open Place card after landmark peek dive"
```

- [ ] **Step 5: Docs touch**

Set spec status to `approved — plan at docs/superpowers/plans/2026-08-21-landmark-peek.md`. Optionally one line in `CONTEXT.md` under Globe: peek dive then card.

```bash
git add docs/superpowers/specs/2026-08-21-landmark-peek-design.md CONTEXT.md
git commit -m "docs: mark landmark peek spec approved"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| `peekAltitudeForTab` values | 1 |
| Card after dive | 3 |
| Promise from Globe | 2 |
| Reduced motion snap | 3 (`ms = 0`) |
| Stale dive cancel | 3 (`peekDiveGen`) |
| Space / Find / ISS unchanged | 3 (branches untouched) |

## Self-review

- No placeholders  
- Signatures consistent: `peekAltitudeForTab(tab) → number`, `pointOfView` setter → Promise  
- Mid-flight card open removed only on Earth fly path  
