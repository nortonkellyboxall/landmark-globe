# Plan 003: One live WebGL context during Earth↔space handoff

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- space-mode.js solar3d.js globe-app.js tests/space-mode.check.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (outbound camera fly and crossfade timing)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

Product constraint: **two live WebGL contexts are forbidden**. The handoff still overlaps them. `Solar3D.init` sets `running = true` and starts `animate()` immediately. `space-mode.js` `enter()` calls `ensure()` (which inits) while Earth is still flying the camera out; `globe.setActive(false)` runs only **900ms after** `.show`. On the way back, Earth `setActive(true)` runs while Solar3D keeps rendering for another **800ms**. Those windows are exactly when intro zooms and whooshes run — the worst time for two GPUs. Pause the outgoing renderer before the incoming one starts drawing; keep the Earth POV **fly** on the Earth renderer until the swap instant.

## Current state

Globe pause already exists and stops globe.gl + the custom tick:

```461:471:globe-app.js
  function setActive(active) {
    engineActive = !!active;
    if (engineActive) {
      if (typeof world.resumeAnimation === "function") world.resumeAnimation();
      world.controls().enabled = true;
      startTick();
    } else {
      if (typeof world.pauseAnimation === "function") world.pauseAnimation();
      world.controls().enabled = false;
      stopTick();
    }
  }
```

Solar3D init always starts the loop:

```675:676:solar3d.js
  running = true;
  animate();
```

```684:695:solar3d.js
function setActive(active) {
  if (active) {
    if (!running && renderer) {
      running = true;
      clock.getDelta();
      animate();
    }
    onResize();
  } else {
    running = false;
    cancelAnimationFrame(animId);
  }
}
```

`enter()` overlap (ensure/init during fly; pause Earth late):

```169:195:space-mode.js
    if (globe) {
      globe.setAutoRotate(false);
      globe.setPlaces([]);
      globe.setWeather();
      globe.pointOfView(pov.lat || 12, pov.lng || 20, outAlt, ms);
    }
    const primed = ensure({ introZoom: false })
      .then(() => {
        if (Solar3D) {
          Solar3D.setActive(true);
          Solar3D.resize();
          if (Solar3D.frameEarth) Solar3D.frameEarth();
        }
      });
    setTimeout(() => {
      primed.then(() => {
        els.solarSystem.classList.add("show");
        els.globeViz.classList.add("hidden-view");
        // ...
        setTimeout(() => {
          if (globe) globe.setActive(false);
          spaceTransitioning = false;
        }, reduce ? 0 : 900);
      });
    }, reduce ? 0 : Math.round(ms * 0.7));
```

`leave()`: Earth on at 216, Solar off 800ms later (224–228).

CONTEXT: **Space handoff** — Earth↔space transition; `solar3d.js` only renders. Do not rebuild globe.gl. `tests/space-mode.check.js` already injects `loadSolar3D` so Node never inits WebGL.

Target sequence (**do not** freeze the outbound POV fly):

1. Earth stays **active** while `pointOfView(..., ms)` runs.
2. `ensure` / `init` may create the WebGL context and build the scene but **must not** `animate()` until the swap.
3. At the swap instant (when `#solarSystem` gets `show` and globe viz gets `hidden-view`): `Solar3D.setActive(true)` then `globe.setActive(false)` in the same turn (solar first so one frame of overlap is OK; Earth must not keep ticking after solar is shown).
4. On leave: after inbound zoom promise, `Solar3D.setActive(false)` **then** `globe.setActive(true)` (same turn), then CSS show Earth / hide solar.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused | `node tests/space-mode.check.js` | `space-mode.check.js OK` |
| Full | ten `node tests/*.check.js` | all OK |

## Suggested executor toolkit

- Graphify: `graphify query "createSpaceMode setActive init enter leave"` with `required_permissions: ["all"]`.
- TDD on injected Solar3D fake in `tests/space-mode.check.js`.

## Scope

**In scope**:
- `solar3d.js` — `init(container, opts)` honors `opts.startActive === false` (default **true** for any other caller)
- `space-mode.js` — `ensure` / `enter` / `leave` ownership
- `tests/space-mode.check.js`

**Out of scope**:
- Frozen-canvas screenshot crossfade (CSS `hidden-view` opacity is enough)
- Merging `tweenCamera` rAF into `animate()` (deferred)
- `globe-app.js` `setActive` implementation (already correct)
- Fireflies (plan 001), textures (002/006), InstancedMesh (005)
- Recreating two live contexts “for nicer blend”

## Git workflow

- Branch: `feature/perf-webgl-handoff` or shared wave branch
- Commit: `perf(space): pause outgoing webgl on handoff`
- graphify after commit

## Steps

### Step 1: `init` can build without spinning

In `solar3d.js` `init`, replace unconditional start with:

```js
const startActive = !opts || opts.startActive !== false;
running = startActive;
if (startActive) animate();
```

Keep `setActive` as the only way to start the loop when `startActive` was false.

**Verify**: `rg "running = true" solar3d.js` — init only sets running true when `startActive`. `rg "animate\\(\\)" solar3d.js` — init calls `animate()` only inside that guard; `setActive` still calls it.

### Step 2: `ensure` inits paused

In `space-mode.js` `ensure`, pass `startActive: false` into `Solar3D.init`. After init, `dataset.ready = "1"` as today. Do **not** call `setActive(true)` inside `ensure` except when `ensureOpts.introZoom` needs a running scene **and** the solar view is already shown — simplest rule: **`ensure` never starts the loop**. `enter` / `leave` / existing “already ready” path own `setActive`.

Today the “already ready” branch does `Solar3D.setActive(true)` immediately — that is OK only if `enter` is the caller and will show solar. Change that branch to **not** `setActive(true)`; `enter` will do it at swap.

**Verify**: `rg "startActive" space-mode.js` matches `init` call. `ensure` body has no `setActive(true)` (or only comments).

### Step 3: Swap ownership in `enter` / `leave`

`enter` swap timeout (the `primed.then` that adds `show`):

```js
if (Solar3D) {
  Solar3D.resize();
  if (Solar3D.frameEarth) Solar3D.frameEarth();
  Solar3D.setActive(true);
}
if (globe) globe.setActive(false);
els.solarSystem.classList.add("show");
els.globeViz.classList.add("hidden-view");
// globeShadow hidden-view as today
if (Solar3D && Solar3D.playIntroZoom && !reduce) Solar3D.playIntroZoom();
spaceTransitioning = false;
```

Remove the inner `setTimeout(..., 900)` that only paused the globe.

`leave` after inbound promise: `if (Solar3D) Solar3D.setActive(false)` **before** `globe.setActive(true)`. Keep CSS class toggles. Remove the 800ms delay **only insofar as it delayed `setActive(false)`**; you may keep a short timeout for `els.solarSystem.hidden = true` (DOM hide after CSS fade) — that must **not** leave `running === true`. Call `setActive(false)` immediately at swap; hide DOM 800ms later if needed.

**Verify**: `rg "setActive\\(false\\)" space-mode.js` on enter path is next to solar `setActive(true)`, not inside a 900ms timer. `rg "900" space-mode.js` — no globe-pause delay. Leave path: solar `setActive(false)` before globe `setActive(true)`.

### Step 4: Tests with a fake Solar3D

Extend `tests/space-mode.check.js` fake (the `loadSolar3D` one) to record `init` opts and `setActive` calls:

```js
const solarCalls = [];
loadSolar3D: async () => ({
  init(_el, opts) { solarCalls.push(["init", opts && opts.startActive]); },
  setActive(on) { solarCalls.push(["setActive", on]); },
  resize() {},
  frameEarth() {},
  playIntroZoom() {},
}),
```

Use `matchReduce: () => true` so timers are 0. `getGlobe` returns `{ setAutoRotate() {}, setPlaces() {}, setWeather() {}, pointOfView() { return {}; }, setActive(on) { globeActive.push(on); } }`.

After `await canvasMode.ensure()` (or `enter` then a `setTimeout(0)` / `await Promise.resolve()` twice):

- `init` was called with `startActive === false`
- After `enter()` with reduce=true, eventually `setActive(true)` on solar and `setActive(false)` on globe
- `preload` still must not call `init` (existing assert)

TDD: add asserts first (RED), then implement.

**Verify**: `node tests/space-mode.check.js` → OK.

### Step 5: Full suite

**Verify**: ten checks OK.

## Test plan

- New asserts in `tests/space-mode.check.js` as Step 4. Pattern: existing `loadSolar3D` fake at lines 68–91.
- Do not import `solar3d.js` in Node (Three importmap).
- Human smoke (note, not a Node gate): pinch to space — Earth fly still animates, then solar appears; pinch/tab back — Earth is live, solar not spinning the fan. If outbound fly **freezes mid-zoom**, you paused Earth too early — STOP and move `globe.setActive(false)` to the swap instant only.

## Done criteria

- [ ] `init(..., { startActive: false })` does not call `animate()`
- [ ] `ensure` does not `setActive(true)`
- [ ] enter swap: solar on, then earth off, same turn; no 900ms earth-pause timer
- [ ] leave swap: solar off, then earth on, same turn
- [ ] `node tests/space-mode.check.js` OK with init/setActive asserts
- [ ] ten checks OK
- [ ] README 003 DONE; graphify updated

## STOP conditions

- Outbound `pointOfView` fly freezes (Earth paused too soon).
- `pauseAnimation` is missing on globe.gl and Earth never stops — report; do not polyfill by destroying the globe.
- You “fix” overlap by keeping both loops and lowering pixel ratio — violates the dual-live constraint.
- `init` without Three in tests starts failing because you imported `solar3d.js`.

## Maintenance notes

- Any new space intro animation must start **after** `setActive(true)` on Solar3D.
- Reviewer: grep `setActive` in `space-mode.js` and confirm one owner at a time except possibly one frame at the swap.
- Plan 006 will call `warmTextures` from `preload` — that must still not create a WebGL renderer.
