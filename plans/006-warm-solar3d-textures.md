# Plan 006: Warm Solar3D textures before the first pinch

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- solar3d.js space-mode.js tests/space-mode.check.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/003-one-live-webgl-handoff.md (`init` must not start rendering from preload)
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

`makePlanetTexture` fills a 256×256 `ImageData` with nested noise (about 65k pixels × ~11 painted bodies on first `buildScene`). `space-mode.js` `preload()` only `import()`s the module; `Solar3D.init` (and those pixel loops + GPU uploads) still run on first `ensure` during the handoff camera move. Warming textures into the existing `textureCache` during idle (after globe ready) moves that hitch off the pinch. `textureCache` already dedupes by `def.id + style`. Do **not** create a WebGL renderer in `preload`.

## Current state

```63:66:solar3d.js
function makePlanetTexture(def) {
  const key = def.id + ":" + (def.style || "rocky");
  if (textureCache.has(key)) return textureCache.get(key);
```

`buildScene` maps `SPACE_BODIES` through `toVisualDef` and `makePlanetMesh` → `makePlanetTexture`. Belt/star skip planet tex; star uses `makeGlowTexture` too.

```108:110:space-mode.js
  function preload() {
    return loadSolar3DModule().catch(() => {});
  }
```

`boot.js` `markGlobeReady` already calls `spaceMode.preload()` (must stay import + warm, never `ensure`).

`tests/space-mode.check.js` 82–90: fake `loadSolar3D` returns `{ init() { solarInits += 1 } }`; preload must not call `init`.

Plan 003: `init(..., { startActive: false })`. Warming must **not** call `init` at all.

Exports today: `init, destroy, resize, setActive, highlight, playIntroZoom, frameEarth, zoomToEarth` — add `warmTextures`.

Cannot import `solar3d.js` in Node. Test via injected module: `warmTextures` called, `init` not called.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused | `node tests/space-mode.check.js` | OK |
| Full | ten checks | all OK |

## Suggested executor toolkit

- Graphify: `graphify query "preload makePlanetTexture textureCache"` with `required_permissions: ["all"]`.
- If 003 is not on HEAD, STOP (depends on paused init so a mistaken `ensure` in preload is obvious in review).

## Scope

**In scope**:
- `solar3d.js` — `warmTextures` export; uses `toVisualDef` + `makePlanetTexture` / `makeGlowTexture` / `makeAtmosphereTexture` as `buildScene` needs
- `space-mode.js` — `preload` calls `Solar3D.warmTextures?.()` after load, still `.catch(() => {})`
- `tests/space-mode.check.js`

**Out of scope**:
- Calling `init` or `ensure` from `preload` / `markGlobeReady`
- Off-thread workers (no new infra)
- Replacing canvas textures with image files
- `globe-app.js` Earth JPEG (plan 002)

## Git workflow

- Branch: `feature/perf-warm-solar-textures` or shared wave branch **after 003 is merged/included**
- Commit: `perf(space): warm planet textures on preload`
- graphify after commit

## Steps

### Step 1: RED — preload must invoke `warmTextures`

In `tests/space-mode.check.js`, on the existing `loadSolar3D` fake, add `warmTextures() { solarWarms += 1; }` and `let solarWarms = 0`. After `await canvasMode.preload()`:

```js
assert.equal(solarLoads, 1);
assert.equal(solarWarms, 1);
assert.equal(solarInits, 0);
```

**Verify**: check fails (`solarWarms === 0`). RED.

### Step 2: `warmTextures` in solar3d.js

```js
function warmTextures() {
  SPACE_BODIES.map(toVisualDef).forEach((def) => {
    if (def.kind === "belt") return;
    makePlanetTexture(def);
    if (def.kind === "star") makeGlowTexture();
    if (def.atmosphere) makeAtmosphereTexture(def.color);
  });
}
```

Match whatever `makePlanetMesh` / star branch actually calls (read `makePlanetMesh` — if it always `makePlanetTexture`, do that; if atmosphere helper exists only for some defs, call the same helpers). Must fill `textureCache` so `buildScene` hits the cache.

Does **not** touch `renderer`, `init`, or `running`.

Add `warmTextures` to the `export { ... }` list.

**Verify**: `rg "function warmTextures" solar3d.js` hits. `rg "WebGLRenderer" solar3d.js` — still only inside `init`.

### Step 3: `preload` calls it

```js
function preload() {
  return loadSolar3DModule()
    .then((mod) => {
      if (mod && typeof mod.warmTextures === "function") mod.warmTextures();
    })
    .catch(() => {});
}
```

`loadSolar3DModule` already assigns `Solar3D = mod`. Calling `warmTextures` on `mod` or `Solar3D` is the same.

`warmTextures` uses `document.createElement("canvas")`. In Node preload tests the fake does not run solar3d. In the browser, `markGlobeReady` → `preload` runs after DOM exists. If `warmTextures` throws (no document), `preload` must still catch (existing `.catch`).

**Verify**: `node tests/space-mode.check.js` GREEN (warms 1, inits 0).

### Step 4: Full suite

**Verify**: ten checks OK.

## Test plan

- Step 1 asserts. Pattern: existing preload fake in `tests/space-mode.check.js`.
- Do not import `solar3d.js` in Node.
- Human: first pinch after load should hitch less; second visit already cached. If first pinch **regresses** (double work), `textureCache` key mismatch — STOP and compare keys with `makePlanetTexture`.

## Done criteria

- [ ] `warmTextures` exported; no WebGL in that function
- [ ] `preload` calls it; still never calls `init` / `ensure`
- [ ] `markGlobeReady` still only `preload()`, not `ensure()`
- [ ] space-mode check: warms 1, inits 0
- [ ] ten checks OK; README 006 DONE; graphify updated

## STOP conditions

- Plan 003 not present and `preload` would need `init` to build textures — do not init. Canvas 2D cache only.
- `warmTextures` requires `window` in a way that breaks `loadSolar3D` fake tests.
- You create an OffscreenCanvas worker.

## Maintenance notes

- New `SPACE_BODIES` styles: `toVisualDef` + `makePlanetTexture` keys must stay in sync with `warmTextures`.
- Reviewer: `boot.js` `markGlobeReady` must not regress to `ensure()` (that bug was already fixed once: WebGL on globe-ready).
