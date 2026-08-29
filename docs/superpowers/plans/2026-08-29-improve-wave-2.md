# Improve wave 2 — verify, clips, mute, Space Find, collection

**Date:** 2026-08-29  
**Branch:** `feature/improve-wave-2`  
**Planned at:** `2f386a8`

Execute with Subagent-Driven Development. One implementer per task, TDD, then a task reviewer. Do not pause between tasks.

## Global Constraints

- Vanilla JS ES modules. No bundler, no TypeScript, no new npm deps, no jsdom.
- Tests: Node `assert` files `tests/*.check.js`, fake `els` / storage. Never jsdom.
- After code commits in this worktree: `graphify update .` with Shell `required_permissions: ["all"]`. Use `--force` only if shrink-guard fires.
- Conventional Commits: `feat(find): …` / `fix(sound): …` / `test: …` / `chore: …` — imperative, no capital, no period, max 50 chars.
- ADR 0002: quiz rules stay out of Globe and CardMedia. Find logic stays in `quiz.js` / `find-game.js` / `find-progress.js`.
- CONTEXT.md vocabulary: Place, Find quiz, SpaceCatalog, Luna, CardMedia, Globe, Space handoff, Adventure navigation.
- Ponytail: smallest seam that fails if the logic breaks. No extra abstractions.
- Do not push, merge to main, or open a PR.
- Do not recreate `chrome.js`. Do not merge `toy.css` into `app.css`. Do not add a second WebGL context.
- Graphify-first: before Read/Grep/Glob exploring, `graphify query "<question>"` with `required_permissions: ["all"]`.
- **TDD (mandatory for production JS):** write the failing check first, run it, confirm it fails for the right reason, then minimal code, then re-run. Record RED and GREEN command output in the report. Generated MP3s and YAML CI are TDD exceptions (config / generated), but the Node check that asserts clips exist is not.

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| One check | `node tests/<name>.check.js` | prints `<name>.check.js OK`, exit 0 |
| Full suite (after Task 1) | `node scripts/verify-checks.mjs` | all OK lines, exit 0 |
| Graphify | `graphify update .` (`required_permissions: ["all"]`) | rebuild succeeds |

---

## Task 1: One-command verify for all Node checks

Add a root runner that executes every `tests/*.check.js` and a GitHub Action that runs it.

### Seams

- `scripts/verify-checks.mjs` exports `listCheckFiles(testsDir)` (sorted basenames ending in `.check.js`).
- CLI: `node scripts/verify-checks.mjs` runs each file with `node` from repo root, exits non-zero on first failure.

### TDD

1. Create `scripts/verify-checks.mjs` exporting only `listCheckFiles() { return []; }` so the test can import (import-error is the wrong red).
2. Write `tests/verify-checks.check.js` modeled on `tests/place.check.js`: import `listCheckFiles` and `fileURLToPath`; pass the real `tests/` directory; assert the list includes `place.check.js`, `sound.check.js`, `find-game.check.js`; assert length >= 15. Run it — must fail because the list is empty.
3. Implement `listCheckFiles` with `readdirSync` + filter + sort. Re-run — pass.
4. Add CLI `main` (only when `import.meta.url === pathToFileURL(process.argv[1]).href`): spawn `node <file>` per check with `stdio: inherit`, `exit 1` on non-zero. Do **not** run `verify-checks.check.js` from inside itself in a way that infinite-loops: the runner runs all `*.check.js` including this one. That's OK — `listCheckFiles` does not spawn. When the CLI runs this check, it only asserts the list, then OK.
5. Add `.github/workflows/checks.yml`: `ubuntu-latest`, Node 20, `node scripts/verify-checks.mjs`. No TTS bake in CI.

### Scope

**In:** `scripts/verify-checks.mjs` (create), `tests/verify-checks.check.js` (create), `.github/workflows/checks.yml` (create).

**Out:** `scripts/package.json` TTS bake scripts; do not add a root `package.json`.

### Verify

- `node tests/verify-checks.check.js` → OK
- `node scripts/verify-checks.mjs` → every existing check OK, exit 0

### Commit

`test: add one-command node check runner`

---

## Task 2: Assert Luna clips exist; bake the 19 silent countries

`2f386a8` added countries (colombia, netherlands, norway, ireland, switzerland, turkey, iceland, finland, nigeria, ethiopia, ghana, tanzania, vietnam, philippines, saudiarabia, singapore, costarica, cuba, fiji) without `vendor/tts/clips/{id}.name.mp3` and `{id}.card.mp3`. `speak.js` only `console.warn`s. `scripts/bake-speech.mjs` already walks `allPlaces()` and skips existing files.

### Seams

- `tests/speak-clips.check.js` — for every `allPlaces()` entry with an `id`, `existsSync` both `.name.mp3` and `.card.mp3` under `vendor/tts/clips/`. Model on `tests/speak-phase.check.js`.

### TDD

1. Write `tests/speak-clips.check.js` first. Run `node tests/speak-clips.check.js` — must fail naming a missing country clip (e.g. norway).
2. From repo root, with `scripts/node_modules` present: `node scripts/bake-speech.mjs`. Requires ffmpeg on PATH and `vendor/tts/model`. It skips existing clips and bakes missing ones. If bake cannot run (missing ffmpeg/model/deps), STOP and report — do not stub silent clips.
3. Re-run the check — pass. Re-run `node scripts/verify-checks.mjs`.
4. Bake updates `vendor/tts/clips/manifest.json` — commit that too.

### Scope

**In:** `tests/speak-clips.check.js` (create), `vendor/tts/clips/*.mp3` for missing Place ids, `vendor/tts/clips/manifest.json`.

**Out:** changing `speak.js` fallbacks; do not add TTS to CI; do not add more Places.

### Verify

- `node tests/speak-clips.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`feat(speak): bake clips for new country Places` (MP3s + check together, or two commits: test then clips)

---

## Task 3: Ambient mute restart + generation-guarded card opens

Two independent bugs; one task because both are small and both need a testable seam.

### 3a Mute / ambient

`sound.js` `stopAmbient` leaves `ambientNodes` set until a 900ms timeout; `startAmbient` returns early while it is truthy. Mute off then on within 900ms (boot.js mute handler) leaves pads dead.

**Seam:** `createSound(opts)` accepts optional `opts.createAudioContext` (function returning a fake or real AudioContext). If omitted, use `window.AudioContext` as today. Tests inject a fake that counts `createOscillator` calls.

**Fix:** In `stopAmbient`, copy `{ master, pads }` to locals, set `ambientNodes = null` immediately, then fade/stop those locals on the timeout. `startAmbient` can then create a new graph at once.

**TDD:** In `tests/sound.check.js` (keep existing `ambientKind` asserts), add a fake AudioContext with: `currentTime`, `state: "running"`, `destination`, `createGain` (gain with `value`, `setValueAtTime`, `exponentialRampToValueAtTime`, `setTargetAtTime`, `cancelScheduledValues`, `connect`), `createOscillator` (increment a counter; `connect`, `start`, `stop`, `frequency`), `resume`.  
Call `createSound({ createAudioContext })`, `ensureAudio()`, `setAmbientForMode("on")`, note oscillator count, `stopAmbient()`, immediately `setAmbientForMode("on")`. Assert oscillator count increased again (new pads). Do not use real timers of 900ms.

Existing `ambientKind` tests stay.

### 3b Stale card opens

`boot.js` `openLandmark`: peek-dive uses `peekDiveGen`; Space and Find-correct (`skipFly`) use `setTimeout(..., 220)` with no gen check.

**Seam:** new tiny module `schedule-open.js` (name it that) exporting:

```js
export function scheduleOpen(fn, { gen, getGen, wait }) {
  return wait().then(() => {
    if (gen !== getGen()) return false;
    fn();
    return true;
  });
}
```

`wait` is injected (`() => Promise.resolve()` in tests; in boot `() => new Promise((r) => setTimeout(r, 220))`).

**TDD:** `tests/schedule-open.check.js` — (1) wait resolves, gen matches, fn runs, returns true; (2) gen bumped before wait resolves, fn does not run, returns false.

**boot.js:** both `setTimeout(() => card.openPlaceCard(lm), 220)` sites and keep peek-dive using the same gen: `++peekDiveGen` before Space/skipFly/dive; pass captured gen into `scheduleOpen` or the dive `.then`. Space and skipFly must bump gen too so a later dive cancels them and vice versa.

Do not import Three. `boot.js` has import-time side effects — do not import boot from tests.

### Scope

**In:** `sound.js`, `tests/sound.check.js`, `schedule-open.js` (create), `tests/schedule-open.check.js` (create), `boot.js` (openLandmark timeouts only).

**Out:** changing whoosh/tones; space enter/leave generation token (not this task).

### Verify

- `node tests/sound.check.js` → OK
- `node tests/schedule-open.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`fix(sound): restart ambient immediately on mute toggle` and `fix(card): drop stale delayed place opens` (one or two commits)

---

## Task 4: Productize Space Find cues

Engine already supports Space pools (`quiz.js` `findPool("space")`, `tests/find-game.check.js` space wrong-tap on `.ss-size-item`). Gaps: no highlight of the target body; `space-mode.js` `enter()` always `stopFind()` — keep that when leaving Earth (pool changes). When already on Space, `findGame.start()` never calls `enter()`, so the round can run — add Space-native highlight.

### Seams

- `createFindGame` option `highlightTarget(id | null)` — boot wires to `spaceMode.highlight`.
- On `start()` when `getTab() === "space"` and a target exists: `opts.highlightTarget(target.id)` and add class `find-target` on `.ss-size-item[data-id="…"]`.
- On `stop()` / hide prompt / correct (round over): `highlightTarget(null)` and remove `find-target` from size items.
- Do **not** put quiz rules in `globe-app.js` or `solar3d.js`. `Solar3D.highlight` already exists; calling it via `spaceMode.highlight` is the Globe-free path.
- Keep `enter()` → `stopFind()` (Earth hunt cancelled by going to Space).
- Update `.scratch/find-quiz/spec.md`: Space Find is in scope; still no timed scoring.

### TDD

Extend `tests/find-game.check.js` space section (existing `spaceGame`):

1. Fake size item for `sun` as well if needed; `rand: () => 0` picks first fresh in pool (sun before mars after ISS filtered). Assert after `start()` the target's size item has `find-target` (or record `highlightTarget` calls).
2. After `stop()`, highlight called with `null` / class removed.
3. Assert `enter()` still increments `stopFind` in `tests/space-mode.check.js` (existing assert `stopped === 1` — keep it).

Add `highlightTarget` to the earth `createFindGame` opts as a no-op so start() does not throw.

CSS: `.ss-size-item.find-target` — a clear kid-visible ring using existing pin-target / selected tokens in `app.css` (search `.ss-size-item.selected`). Match that language; do not invent a new palette.

### Scope

**In:** `find-game.js`, `tests/find-game.check.js`, `boot.js` (pass `highlightTarget` only), `app.css` (`.find-target` on size items), `.scratch/find-quiz/spec.md`.

**Out:** Earth heat/radar in Space; new 3D radar; removing `stopFind` from `enter()`; timed scoring; ISS in the Find pool.

### Verify

- `node tests/find-game.check.js` → OK
- `node tests/space-mode.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`feat(find): highlight Space targets on the sizes strip`

---

## Task 5: Collection tally — found X of Y for the current pool

`find-progress.js` already persists ids and prefers unfound. UI is a flat sticker sheet. Add per-pool progress for the current adventure set.

### Seams

- `createFindProgress().foundInPool(pool)` returns `{ found: number, total: number, complete: boolean }` where `total` is pool length (unique ids), `found` is how many of those ids are in the persisted set, `complete` is `total > 0 && found === total`.
- Find prompt shows tally via new optional `els.findTally` (`#findTally` in `index.html`). Text like `3 / 12` (no extra words — pre-readers). Hide when tally total is 0.
- After `recordFind` in onCorrect, refresh tally. If `complete`, set find cue to `You found them all!` (in addition to existing found styling).
- Adventure strip already stamps found pins — do not duplicate stamps.

### TDD

`tests/find-progress.check.js`: pool of 3, record 2, `foundInPool` is `{ found: 2, total: 3, complete: false }`; record the third, `complete: true`; empty pool `{ found: 0, total: 0, complete: false }`; ids not in pool do not count.

`tests/find-game.check.js`: add `findTally: fakeEl()`; after start, tally text is `0 / 2` (two earth places, none found); after correct find, `1 / 2`.

### Scope

**In:** `find-progress.js`, `tests/find-progress.check.js`, `find-game.js`, `tests/find-game.check.js`, `index.html` (`#findTally`), `app.css` (minimal tally style next to `.find-stars`).

**Out:** timed scoring; per-continent nested tallies; new persistence keys.

### Verify

- `node tests/find-progress.check.js` → OK
- `node tests/find-game.check.js` → OK
- `node scripts/verify-checks.mjs` → exit 0

### Commit

`feat(find): show found count for the current adventure`

---

## Done when

All five tasks reviewed clean. `node scripts/verify-checks.mjs` exits 0 on the worktree. No files outside each task's scope in that task's commit.
