# Plan 004: Throttle slow globe systems off the display refresh

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- globe-app.js orbit-look.js tests/orbit-look.check.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (sun/aurora/weather could look stepped if periods are too large)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

`createGlobe`’s `startTick` rAF already runs alongside globe.gl’s renderer. Every frame it: `applySun()` (subsolar trig + sun/moon meshes), `tickWeather` (70–90 particles), `tickAurora` (rewrites 176 positions + another `subsolarPoint`), traveler lat/lng, cloud/sun mesh spins, `applyLook`. POV chrome is already sampled every **8** frames (`povFrame % 8`). Sun position changes on a minutes-scale; aurora can run at 30Hz; weather can use accumulated `dt`. Throttling those leaves the rAF for camera-driven `applyLook` and traveler, which is what kids see while spinning the globe. Future animations should not compete with redundant astronomy.

Do **not** import `globe-app.js` from Node tests (it imports `three` via importmap). Put the cadence helper in `orbit-look.js` (already “no Three, keep this testable”).

## Current state

```222:245:globe-app.js
  function startTick() {
    if (!engineActive || tickRaf) return;
    lastTick = performance.now();
    (function tick(now) {
      if (!engineActive) {
        tickRaf = 0;
        return;
      }
      const dt = Math.min(48, now - lastTick);
      lastTick = now;
      applySun();
      tickWeather(dt);
      tickAurora(now);
      const next = travelerPos(now / 1000);
      traveler.lat = next.lat;
      traveler.lng = next.lng;
      if (cloudsMesh) cloudsMesh.rotation.y += 0.00045;
      if (sunMesh) sunMesh.rotation.y += 0.0006;
      const pov = world.pointOfView();
      if (pov) applyLook(pov.altitude);
      povFrame += 1;
      if (povFrame % 8 === 0 && pov) onPov(pov);
      tickRaf = requestAnimationFrame(tick);
    })(lastTick);
  }
```

`applySun` 174–188; `tickAurora` 522–543 (calls `subsolarPoint` every frame); `tickWeather` 551–568 (uses `dt`).

`povFrame % 8` for `onPov` is the pattern to reuse.

CONTEXT: Globe is the Earth view module; callers use a small interface. Do not push quiz rules into Globe (ADR 0002).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused | `node tests/orbit-look.check.js` | OK |
| Full | ten checks | all OK |

## Scope

**In scope**:
- `orbit-look.js` — `GLOBE_TICK` periods + `dueThisFrame(frame, period)`
- `tests/orbit-look.check.js`
- `globe-app.js` — `startTick` only (use helper; accumulate weather `dt`)

**Out of scope**:
- Removing aurora/weather/sun
- Changing `setPlaces` / pin DOM (rejected finding)
- Fireflies (001), Solar3D (003/005/006)
- Adaptive quality by FPS (YAGNI)

## Git workflow

- Branch: `feature/perf-globe-tick` or shared wave branch
- Commit: `perf(globe): throttle sun aurora and weather`
- graphify after commit

## Steps

### Step 1: RED checks for cadence

In `orbit-look.js` (after the altitude constants) you will add:

```js
/** Frame periods for createGlobe's companion rAF. 1 = every frame. */
export const GLOBE_TICK = { sun: 8, aurora: 2, weather: 2, pov: 8 };

export function dueThisFrame(frame, period) {
  const p = Number(period);
  if (!Number.isFinite(p) || p <= 1) return true;
  return frame % p === 0;
}
```

Tests first in `tests/orbit-look.check.js`:

```js
assert.equal(dueThisFrame(0, 8), true);
assert.equal(dueThisFrame(1, 8), false);
assert.equal(dueThisFrame(8, 8), true);
assert.equal(dueThisFrame(3, 1), true);
assert.equal(dueThisFrame(3, 0), true);
assert.equal(GLOBE_TICK.pov, 8);
assert.ok(GLOBE_TICK.sun >= 4);
assert.ok(GLOBE_TICK.aurora >= 2);
```

**Verify**: `node tests/orbit-look.check.js` fails on missing export (RED).

### Step 2: Implement helper (GREEN)

Add the exports. Periods must be exactly: sun **8**, aurora **2**, weather **2**, pov **8**. Do not pick 30/60 without changing tests.

**Verify**: focused check OK.

### Step 3: Wire `startTick`

In `globe-app.js` import `GLOBE_TICK` and `dueThisFrame` from `./orbit-look.js` (file already imports from there).

Keep `let weatherDt = 0` beside `lastTick`. Inside `tick`:

```js
povFrame += 1;
weatherDt += dt;
if (dueThisFrame(povFrame, GLOBE_TICK.sun)) applySun();
if (dueThisFrame(povFrame, GLOBE_TICK.weather)) {
  tickWeather(weatherDt);
  weatherDt = 0;
}
if (dueThisFrame(povFrame, GLOBE_TICK.aurora)) tickAurora(now);
// traveler, cloud spin, sunMesh spin, applyLook: every frame (cheap / camera-coupled)
const pov = world.pointOfView();
if (pov) applyLook(pov.altitude);
if (dueThisFrame(povFrame, GLOBE_TICK.pov) && pov) onPov(pov);
```

Move `povFrame += 1` **before** the due checks so frame 0 still runs sun/aurora/weather on the first tick (dueThisFrame(1, 8) is false — **use post-increment carefully**).

Required: first tick must still `applySun` (otherwise sun/moon sit at origin for 8 frames). So increment **after** checks, **or** use `dueThisFrame(povFrame, n)` with `povFrame` starting at 0 and increment at end (today increment is at end). Keep increment at end; then frame 0: `dueThisFrame(0, 8) === true`. **Do not increment before checks.**

Replace `povFrame % 8 === 0` with `dueThisFrame(povFrame, GLOBE_TICK.pov)`.

**Verify**: `rg "povFrame % 8" globe-app.js` no matches. `rg "applySun\\(\\)" globe-app.js` only inside the sun due-guard in `tick`. `node tests/orbit-look.check.js` OK.

### Step 4: Full suite

**Verify**: ten checks OK.

## Test plan

- Cadence unit tests only (Step 1). Cannot run `createGlobe` in Node.
- Human smoke: spin Earth 10s — sun/moon still on the terminator side; aurora still breathes; rain/snow at a Place still falls (may be 30fps). If aurora strobes, STOP and set `GLOBE_TICK.aurora` to 1, report.

## Done criteria

- [ ] `dueThisFrame` + `GLOBE_TICK` exported and tested
- [ ] `startTick` uses them; weather `dt` accumulated
- [ ] traveler + `applyLook` + cloud/sun **rotation** still every frame
- [ ] `onPov` still every 8 frames
- [ ] ten checks OK; README 004 DONE; graphify updated

## STOP conditions

- Sun/moon jump or sit at 0,0,0 after throttle (first-frame `applySun` skipped).
- You add a second rAF “slow loop” instead of modulo on the existing tick.
- You throttle `applyLook` (camera-coupled; must stay every frame).

## Maintenance notes

- New per-frame globe FX should declare a `GLOBE_TICK` period or run every frame with a one-line comment why.
- Reviewer: weather must consume accumulated `dt`, not `dt` of a single skipped frame only.
