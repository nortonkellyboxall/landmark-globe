# Plan 001: Pause fireflies when the canvas is hidden

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- boot.js orbit-look.js tests/orbit-look.check.js toy.css`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

`startFireflies` in `boot.js` starts an uncancellable `requestAnimationFrame` that clears a full-screen canvas and draws 26 particles with `shadowBlur = 12` every frame. The app boots with `body.deep-space` (`boot.js` `initGlobe`), and `toy.css` sets `.fireflies { opacity: 0 }` in that state — so the loop often paints an invisible canvas beside the WebGL globe. Pausing when hidden (deep-space, `document.hidden`, or reduced motion) frees main-thread and raster time for later animations. Visible fireflies over the near-Earth sky must still run.

## Current state

- `boot.js` — kid-globe boot; owns stars/fireflies/Luna. `startFireflies` at 173–215; called once at 655. `syncOrbitChrome` (477–482) toggles `deep-space` from altitude but does not talk to fireflies.
- `orbit-look.js` — altitude bands; **no Three**; already tested. `isDeepSpace` at 50–52. Put the tick predicate here so Node can test it without importing `boot.js` (boot has import-time side effects: `makeStars(); startFireflies(); initGlobe();`).
- `toy.css:428-431` — `body.deep-space .fireflies { opacity: 0; }` (do not merge into `app.css`).
- `index.html:21` — `<canvas class="fireflies" id="fireflies">`.

`startFireflies` today (always rAF, never cancelled):

```173:215:boot.js
function startFireflies() {
  const canvas = els.fireflies;
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // ...
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bugs.forEach((b) => { /* draw with shadowBlur 12 */ });
    requestAnimationFrame(tick);
  }
  tick();
}
```

`syncOrbitChrome` today:

```477:482:boot.js
function syncOrbitChrome(pov) {
  const alt = pov && pov.altitude;
  document.body.classList.toggle("deep-space", isDeepSpace(alt));
  findGame.syncHeat(pov);
  if (spaceMode.shouldHandoff(alt)) adventure.switchTab("space");
}
```

Conventions: Node `assert` checks, fake objects, never jsdom. Model new asserts on `tests/orbit-look.check.js`. Names: `handle` prefix for listeners (`handleVisibilityChange`). CONTEXT: this is sky chrome, not Find quiz — ADR 0002 does not apply. Ponytail: one predicate + pause/resume; do not extract a `Fireflies` class.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused check | `node tests/orbit-look.check.js` | prints `orbit-look.check.js OK`, exit 0 |
| Full checks | the ten `node tests/*.check.js` listed in Task 11 of `docs/superpowers/plans/2026-08-14-deepen-boot-seams.md` | ten `OK` lines, exit 0 |
| Graphify | `graphify update .` with `required_permissions: ["all"]` | rebuild succeeds (~hundreds of nodes) |

## Suggested executor toolkit

- Graphify-first: before Read/Grep/Glob exploring, `graphify query "startFireflies deep-space"` with `required_permissions: ["all"]`.
- TDD: red assert in `tests/orbit-look.check.js`, then implement `firefliesShouldTick`.

## Scope

**In scope**:
- `orbit-look.js` (add `firefliesShouldTick`)
- `tests/orbit-look.check.js`
- `boot.js` (`startFireflies` pause/resume; call from `syncOrbitChrome` + visibility)

**Out of scope**:
- `toy.css` / `app.css` — keep opacity-0 as a visual fallback; do not delete fireflies art
- Star DOM (`makeStars`), shooting stars, Luna
- WebGL pause (plan 003)
- New files, new npm deps, jsdom

## Git workflow

- Branch: `feature/perf-pause-fireflies` (or shared `feature/perf-animation-headroom` if doing the whole wave)
- Commit: `perf(sky): pause fireflies when hidden`
- Do NOT push unless asked
- After commit: `graphify update .` with `required_permissions: ["all"]`

## Steps

### Step 1: Failing checks for the predicate

Add to `tests/orbit-look.check.js` (import the new export):

```js
assert.equal(firefliesShouldTick({ reduceMotion: true, deepSpace: false, pageHidden: false }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: true, pageHidden: false }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: false, pageHidden: true }), false);
assert.equal(firefliesShouldTick({ reduceMotion: false, deepSpace: false, pageHidden: false }), true);
```

**Verify**: `node tests/orbit-look.check.js` → fails (missing export). That is RED.

### Step 2: Implement the predicate

In `orbit-look.js` next to `isDeepSpace`:

```js
export function firefliesShouldTick({ reduceMotion, deepSpace, pageHidden }) {
  return !reduceMotion && !deepSpace && !pageHidden;
}
```

**Verify**: `node tests/orbit-look.check.js` → `orbit-look.check.js OK`.

### Step 3: Pause and resume the rAF in boot

Change `startFireflies` so:

1. Keep one `raf` id (let `fireflyRaf = 0`).
2. At the **start** of `tick`, if `!firefliesShouldTick({ reduceMotion, deepSpace: document.body.classList.contains("deep-space"), pageHidden: document.hidden })`, do **not** schedule another frame (`fireflyRaf = 0; return` after skip). Skipping the draw is required; skipping the next rAF is the actual win.
3. Export nothing from `boot.js`.
4. Add `function syncFireflies()` that starts `tick()` only when `fireflyRaf === 0` and `firefliesShouldTick(...)` is true.
5. Call `syncFireflies()` at the end of `syncOrbitChrome` (after the `deep-space` toggle).
6. Listen once: `document.addEventListener("visibilitychange", handleFireflyVisibility)` → `syncFireflies()`.

Reduced-motion: if the user prefers reduce, never start (same as today). `reduceMotion` can be read once at start **and** inside the predicate via `matchMedia` each `syncFireflies` so a live change pauses.

Do not `clearRect` on pause (opacity 0 already hides it). Do not create a second canvas.

**Verify**: `node tests/orbit-look.check.js` still OK. `rg "requestAnimationFrame\\(tick\\)" boot.js` still has exactly one schedule site, inside `tick` after the guard. `rg "syncFireflies" boot.js` shows calls from `syncOrbitChrome` and the visibility handler.

### Step 4: Full check list

Run all ten existing checks (no new WebAudio/jsdom).

**Verify**: all exit 0.

## Test plan

- New asserts in `tests/orbit-look.check.js` as in Step 1 (four cases). Pattern: existing `isDeepSpace` asserts in the same file.
- No boot.js import in tests (side effects).
- Verification: `node tests/orbit-look.check.js` → OK including the four new asserts.

## Done criteria

- [ ] `node tests/orbit-look.check.js` exits 0 with the four `firefliesShouldTick` asserts
- [ ] `rg "shadowBlur" boot.js` still present (drawing unchanged when ticking)
- [ ] `syncOrbitChrome` calls `syncFireflies` after toggling `deep-space`
- [ ] `visibilitychange` handler exists
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row for 001 is DONE
- [ ] `graphify update .` run after the commit

## STOP conditions

- `boot.js` no longer contains `startFireflies` / the rAF loop (drift).
- Fix seems to need a new module or jsdom.
- Fireflies never appear after zooming in from deep-space (if you smoke-test: zoom in until `deep-space` class drops; canvas should tick again). If resume is broken after two fix attempts, STOP and report.
- You think the canvas should be deleted entirely — that is out of scope.

## Maintenance notes

- Future sky FX should use `firefliesShouldTick` (or the same signals) rather than a new uncancellable rAF.
- Reviewer: confirm pause **cancels** rAF, not only skips `fill` while remaining scheduled.
- Plan 003 pauses WebGL separately; do not fold globe pause into this change.
