# Improve wave 3 — Space race, pin budget, aurora skip, serve denylist, ISS

**Date:** 2026-08-29  
**Branch:** `feature/improve-wave-3`  
**Planned at:** after `feature/improve-wave-2` is on `main` (wave 2 HEAD `7da45a8` plus this plan commit)

Execute with Subagent-Driven Development. One implementer per task, TDD, then a task reviewer. Do not pause between tasks. Start a **new** worktree from updated `main`; do not keep stacking on `feature/improve-wave-2`.

## Global Constraints

- Vanilla JS ES modules. No bundler, no TypeScript, no new npm deps, no jsdom.
- Tests: Node `assert` files `tests/*.check.js`, fake `els` / storage. Never jsdom. Python unittest is allowed only for `serve.py` (Task 4).
- After code commits in this worktree: `graphify update .` with Shell `required_permissions: ["all"]`. Use `--force` only if shrink-guard fires.
- Conventional Commits: `feat(…):` / `fix(…):` / `perf(…):` / `test:` / `chore:` — imperative, no capital, no period, max 50 chars.
- ADR 0002: quiz rules stay out of Globe and CardMedia. Find logic stays in `quiz.js` / `find-game.js` / `find-progress.js`.
- CONTEXT.md vocabulary: Place, Find quiz, SpaceCatalog, Luna, CardMedia, Globe, Space handoff, Adventure navigation.
- Ponytail: smallest seam that fails if the logic breaks. No extra abstractions.
- Do not push, merge to main, or open a PR unless asked.
- Do not recreate `chrome.js`. Do not merge `toy.css` into `app.css`. Do not add a second WebGL context.
- Do **not** add ISS to the Find pool (Space already filters `kind: "station"` in `quiz.js`; Earth Find uses Adventure places, which must stay ISS-free).
- Nested planet-surface / land-on-Mars stays out of this wave.
- Graphify-first: before Read/Grep/Glob exploring, `graphify query "<question>"` with `required_permissions: ["all"]`.
- **TDD (mandatory for production JS):** write the failing check first, run it, confirm it fails for the right reason, then minimal code, then re-run. Record RED and GREEN command output in the report. Generated MP3s are a TDD exception (bake after the clip check goes red). YAML/CI config is a TDD exception.

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| One check | `node tests/<name>.check.js` | prints `<name>.check.js OK`, exit 0 |
| Full suite | `node scripts/verify-checks.mjs` | all OK lines, exit 0 |
| Graphify | `graphify update .` (`required_permissions: ["all"]`) | rebuild succeeds |

---

## Task 1: Space enter/leave must not no-op on overlap

`space-mode.js` `enter()` returns immediately when `spaceTransitioning` is true. `leave()` holds that flag for 400ms after the inbound camera tween. A tab tap (or pinch) during leave is dropped — the next Space enter never runs.

### Seams

- Module-private `transGen` (number). Both `enter` and `leave` do `const gen = ++transGen` at the start and set `spaceTransitioning = true`.
- Remove `if (spaceTransitioning) return;` from `enter`.
- Every async continuation (`primed.then`, `inbound.then`, the 400ms `setTimeout`) returns early when `gen !== transGen`.
- `isTransitioning()` stays a boolean for chrome; generation is the cancel token.

### TDD

`tests/space-mode.check.js` (the `canvasMode` block that already fakes `setViewMode`):

1. After `await canvasMode.leave({ quiet: true })`, **do not wait 450ms**. Immediately call `canvasMode.enter({ overview: true })`.
2. Flush microtasks (`await Promise.resolve()` twice, plus `setTimeout(0)` like the existing enter assertions).
3. **RED (today):** `solarCalls` has no new `setViewMode`/`solar` because `enter` no-ops. Assert `solarCalls.some((c) => c[0] === "setViewMode" && c[1] === "solar")` after the immediate re-enter — this fails until the guard is removed.
4. Implement generation. Re-run — pass.
5. Keep the existing 450ms wait + overview-enter assertion later in the file; it still proves a settled leave then tab overview whooshes.

### Scope

**In:** `space-mode.js`, `tests/space-mode.check.js`.

**Out:** pinch-arm hysteresis numbers; `shouldEnterSpace` / `shouldLeaveSpace`; Solar3D camera math.

### Verify

- `node tests/space-mode.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`fix(space): honor enter during leave transition`

---

## Task 2: Throttle Earth pin projection

`globe-app.js` `startPinLoop` calls `syncPins()` every rAF. Each pin calls `Solar3D.projectEarthLatLng`, which allocates two `Vector3` clones per pin (`toCam`, `outward`). ISS motion can update every frame; HTML pin CSS does not need to.

### Seams

- `orbit-look.js`: add `pins: 8` to `GLOBE_TICK` (same period as `pov`). Reuse existing `dueThisFrame`.
- `globe-app.js` pin loop: increment `pinFrame`. Always write `traveler.lat` / `traveler.lng` from `travelerPos(performance.now() / 1000)` so a tap still uses a live position. Call the projection/`style` work only when `dueThisFrame(pinFrame, GLOBE_TICK.pins)`.
- `solar3d.js` `projectEarthLatLng`: replace `_projWorld.clone().sub(...)` with two module-level temps (`_projToCam`, `_projOutward`), same pattern as `_projLocal` / `_projWorld` / `_projNdc`.

### TDD

`tests/orbit-look.check.js`: `assert.equal(GLOBE_TICK.pins, 8)`; `dueThisFrame(7, GLOBE_TICK.pins) === false`; `dueThisFrame(8, GLOBE_TICK.pins) === true`.

`tests/globe-app.check.js` if one exists and already stubs rAF — only then assert the skip. If there is **no** globe-app check (today there is not), do **not** create a Three/jsdom globe test. The `GLOBE_TICK.pins` assertion is the seam. Wire `dueThisFrame` in `globe-app.js` in the same commit.

Manual: ISS pin still tracks; landmark pins still hide on the back side.

### Scope

**In:** `orbit-look.js`, `tests/orbit-look.check.js`, `globe-app.js`, `solar3d.js` (temps only in `projectEarthLatLng`).

**Out:** merging pin rAF into Solar3D `animate()`; changing pin DOM structure; ISS mesh (Task 6).

### Verify

- `node tests/orbit-look.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`perf(globe): throttle pin projection to every 8 frames`

---

## Task 3: Skip aurora CPU in solar view

`earth-surface.js` `tick` always runs `tickAurora` (vertex waves for 14 curtains). `solar3d.js` already passes `showLocal` false in solar view (`viewMode === "earth" || (followEarth && blend < 0.4)`), but that flag only hides weather/radar, not aurora work.

### Seams

- `earth-fx.js` (already pure, no Three):

```js
export function auroraShouldTick(showLocal, frame, period = GLOBE_TICK.aurora) {
  return !!showLocal && dueThisFrame(frame, period);
}
```

Import `dueThisFrame` / `GLOBE_TICK` from `orbit-look.js` into `earth-fx.js`.

- `earth-surface.js` `tick`: `if (auroraGroup) auroraGroup.visible = !!showLocal`; `if (auroraShouldTick(showLocal, fxFrame)) tickAurora(nowMs)`.
- Weather/radar stay on `showLocal` as today. Clouds/atmo keep spinning (cheap).

### TDD

`tests/earth-fx.check.js`:

```js
assert.equal(auroraShouldTick(false, 0, 2), false);
assert.equal(auroraShouldTick(true, 1, 2), false);
assert.equal(auroraShouldTick(true, 2, 2), true);
```

Wire `earth-surface.js` after GREEN on the helper.

### Scope

**In:** `earth-fx.js`, `tests/earth-fx.check.js`, `earth-surface.js`.

**Out:** skipping clouds/atmo; disposing aurora in solar; changing `showLocal` blend threshold in `solar3d.js`.

### Verify

- `node tests/earth-fx.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`perf(earth): skip aurora updates off the earth view`

---

## Task 4: `serve.py` refuse repo-private paths

`serve.py` binds `0.0.0.0:8000` with `SimpleHTTPRequestHandler`. LAN devices can fetch `/.git/`, `.scratch/`, `.cursor/`.

### Seams

```python
BLOCKED_PREFIXES = ("/.git", "/.scratch", "/.cursor")

def path_is_blocked(url_path: str) -> bool:
    p = url_path.split("?", 1)[0]
    return any(p == prefix or p.startswith(prefix + "/") for prefix in BLOCKED_PREFIXES)
```

In `NoCacheHandler.do_GET` (and `do_HEAD` if you override it): if `path_is_blocked(self.path)`, `self.send_error(403, "Forbidden")` and return. Do not call `translate_path` for blocked URLs.

`scripts/verify-checks.mjs`: after JS checks, also spawn `python3` for each `tests/*.check.py` (sorted). Empty list is fine. CI image already has Python 3.

### TDD

1. Add `path_is_blocked` + `BLOCKED_PREFIXES` to `serve.py` so tests can import the module without starting the server (`if __name__ == "__main__"` stays).
2. Write `tests/serve-path.check.py`:

```python
import unittest
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "serve", Path(__file__).resolve().parent.parent / "serve.py"
)
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)

class PathBlocked(unittest.TestCase):
    def test_git(self):
        self.assertTrue(serve.path_is_blocked("/.git/config"))
        self.assertTrue(serve.path_is_blocked("/.git"))
    def test_scratch_cursor(self):
        self.assertTrue(serve.path_is_blocked("/.scratch/x"))
        self.assertTrue(serve.path_is_blocked("/.cursor/rules/x"))
    def test_app_ok(self):
        self.assertFalse(serve.path_is_blocked("/index.html"))
        self.assertFalse(serve.path_is_blocked("/boot.js"))
        self.assertFalse(serve.path_is_blocked("/vendor/tts/clips/eiffel.name.mp3"))

if __name__ == "__main__":
    unittest.main()
```

3. Run `python3 tests/serve-path.check.py` — RED until the function exists, then GREEN.
4. Extend `verify-checks.mjs`. `tests/verify-checks.check.js`: if you assert only `.check.js` names, keep that; add a second export `listPyCheckFiles` and assert it includes `serve-path.check.py` after the file exists.

Do **not** block `/vendor/` — clips and Three must stay served.

### Scope

**In:** `serve.py`, `tests/serve-path.check.py` (create), `scripts/verify-checks.mjs`, `tests/verify-checks.check.js`.

**Out:** auth; HTTPS; changing `HOST`/`PORT`; blocking `scripts/` (bake tools are not secret).

### Verify

- `python3 tests/serve-path.check.py` → OK
- `node tests/verify-checks.check.js` → OK
- `node scripts/verify-checks.mjs` → runs JS then the Python check, exit 0

### Commit

`fix(serve): forbid git and editor paths on lan`

---

## Task 5: ISS as a Place (card + Luna), not a Find target

Today `boot.js` `openLandmark("iss")` plays pop, Luna cheer, and returns — no card, no clips. `globe-app.js` already renders a `kind: "traveler"` pin. `quiz.js` already excludes `kind: "station"` from Space Find.

### Seams

- New `travelers.js`: one Place object `id: "iss"`, `kind: "station"`, `emoji: "🛰️"`, `name: "The ISS"`, `place: "Orbiting Earth"`, kid `story` / `wow`, 2–3 Wikimedia `photos` (same 960px thumb pattern as `space-catalog.js`), optional `video` YouTube id. **No** `visual` / `au` / `orbitYears` — ISS is not a SpaceCatalog body and must not appear on the sizes strip (`space-mode` builds sizes from `SPACE_BODIES` only).
- `place.js`: `import { TRAVELERS } from "./travelers.js"`; append `TRAVELERS` to `PACKS`; re-export `TRAVELERS`.
- `boot.js`: delete the cheer-only `if (id === "iss")` branch. Resolve the Place with `adventure.getPlaces().find(...) || placeById(id)`. For peek-dive, use live ISS coords: add `getIssPos()` on the Globe return (`{ lat, lng }` from the in-memory `traveler`). `pointOfView(iss.lat, iss.lng, peekAltitudeForTab(tab), ms)`.
- Luna: same hunt/speakName path as other Places (not a special cheer).
- Do **not** add ISS to Adventure tab pools / strip. Pin list stays `places.concat(traveler)` inside Globe.

### TDD

`tests/place.check.js`: `placeById("iss")?.kind === "station"`; `allPlaces()` includes `"iss"`; ids still unique.

`tests/quiz.check.js`: already asserts Space Find ids are `sun, mars, luna` when ISS is in the list — keep that. Add: `findPool("landmarks", [{ id: "iss", kind: "station", lat: 1, lng: 2 }, { id: "eiffel", lat: 48, lng: 2 }])` still includes ISS **if** it is passed in (geoPool). That is fine — boot must not pass ISS into `getPlaces()`. Add a comment in `travelers.js` and `CONTEXT.md` that Adventure pools omit travelers.

`tests/speak-clips.check.js` will go RED for `iss.name.mp3` / `iss.card.mp3` once ISS is in `allPlaces()`. Bake: `node scripts/bake-speech.mjs` (ffmpeg + `vendor/tts/model` + `scripts/node_modules`). Commit new mp3s + `manifest.json`. If bake cannot run, STOP — do not stub silent files.

Do **not** import `boot.js` in tests (import-time side effects).

### CONTEXT.md

Place glossary: a Place may also be a traveler/station (ISS). SpaceCatalog still does not own ISS. Find quiz: ISS is not in Adventure pools; Space Find still excludes `station`.

### Scope

**In:** `travelers.js` (create), `place.js`, `tests/place.check.js`, `boot.js`, `globe-app.js` (`getIssPos`), `CONTEXT.md`, baked `vendor/tts/clips/iss.name.mp3` + `iss.card.mp3` + manifest.

**Out:** ISS mesh (Task 6); adding ISS to `SPACE_BODIES`; including ISS in Find; changing `kind: "traveler"` on the pin.

### Verify

- `node tests/place.check.js` → OK
- `node tests/quiz.check.js` → OK
- `node tests/speak-clips.check.js` → OK after bake
- `node scripts/verify-checks.mjs` → exit 0
- Browser: tap the ISS pin → peek-dive + card + Luna name clip. Space sizes strip still has no ISS row. Landmarks Find tally unchanged.

### Commit

`feat(places): add ISS card and Luna clips`

---

## Task 6: ISS mesh on the shared Earth (one WebGL)

After Task 5 the pin and card exist. Add a small 3D craft as a **child of the Earth mesh** so it rides axial spin. Still one canvas. `solar3d.js` renders; it does not own quiz.

### Seams

- `solar3d.js`: `issMesh` created once when Earth mesh is built (same site as `createEarthSurface`). Geometry: one `BoxGeometry` or `CapsuleGeometry` (no extra texture pipeline). Material: `MeshStandardMaterial` with a pale metal color (`0xdfe7ee` to match the pin). Scale: a few percent of Earth `R` — readable next to Earth, not planet-sized. Altitude: `0.16` Earth radii (same as the pin).
- Each `animate` frame, if `issMesh` and Earth exist: `travelerPos(performance.now() / 1000)`, `earthLocalPos(lat, lng, 0.16, earthRadius())` from `earth-fx.js`, set `issMesh.position`. Point the craft roughly along its velocity only if that is a few lines; otherwise leave orientation default.
- Import `travelerPos` from `traveler-orbit.js` and `earthLocalPos` from `earth-fx.js`.
- Hide or keep the HTML pin — keep the pin; mesh is the solar-view / globe-orbit silhouette. Do not remove `kind: "traveler"`.
- `destroy` / Earth rebuild: dispose geometry/material, null `issMesh`.

### TDD

Cannot mount Three in Node. Add a **pure** helper in `earth-fx.js`:

```js
export function issLocalPos(tSec, R) {
  const { lat, lng } = travelerPos(tSec);
  return earthLocalPos(lat, lng, 0.16, R);
}
```

That would import `traveler-orbit.js` into `earth-fx.js`. Avoid a new cycle: put `issLocalPos` in `traveler-orbit.js` instead, importing `earthLocalPos` from `earth-fx.js` (`earth-fx` must not import `traveler-orbit.js`).

`tests/traveler-orbit.check.js`:

```js
import { issLocalPos } from "../traveler-orbit.js";
const R = 2;
const p = issLocalPos(0, R);
assert.equal(p.length, 3);
assert.ok(Math.abs(Math.hypot(...p) - R * 1.16) < 1e-9);
```

`solar3d.js` calls `issLocalPos` when placing the mesh. STOP if you need a second TextureLoader, a second scene, or ISS in `SPACE_BODIES`.

### Scope

**In:** `traveler-orbit.js`, `tests/traveler-orbit.check.js`, `solar3d.js`.

**Out:** Find; CardMedia; a second renderer; land-on-ISS camera mode.

### Verify

- `node tests/traveler-orbit.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0
- Browser: Earth view — pin still tappable; solar view — a small pale craft near Earth, no second canvas, sizes strip unchanged.

### Commit

`feat(space): add ISS craft on the earth mesh`

---

## Done when

All six tasks reviewed clean. `node scripts/verify-checks.mjs` exits 0 (JS + Python path check). ISS pin opens a Place card with Luna clips. Space Find still excludes ISS. One WebGL context. `plans/README.md` Wave 3 rows 013–018 marked DONE.

## Execution choice (for the human)

- **Subagent-Driven Development** (recommended): one implementer + reviewer per task, isolated `feature/improve-wave-3` worktree.
- **Inline:** same plan, same TDD order, one agent, same commits.
