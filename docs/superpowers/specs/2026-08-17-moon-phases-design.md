# Moon phases toy — design

**Date:** 2026-08-17  
**Status:** approved — implementation plan at `docs/superpowers/plans/2026-08-17-moon-phases.md`  
**Branch target:** feature work off `main`

## Goal

When a kid opens **The Moon** in Space, the usual Place card opens, but the photo gallery is replaced by an interactive phase teacher: a big moon face and a small Earth–Moon–Sun diagram that stay in lockstep. Luna speaks each phase name when the phase changes.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Where it opens | Space → tap The Moon → Place card |
| Card chrome | Name, Hear, story, wow stay; **gallery stays**; **Phases** button opens a full-card overlay for the toy |
| Play model | Both: orbit diagram + big moon face, one shared turn `t` |
| Time model | Toy cycle — not real calendar, not tied to Earth sun-drag |
| Default phase | Full Moon (`t = 0.5`) |
| Speech | Luna speaks the phase **name** when the phase id changes |
| Implementation | Small `moon-phases.js` module + CardMedia mount; no extra WebGL |

## Kid experience

1. Kid is in Space, taps **The Moon** (sizes strip or Solar3D pick).
2. Place card opens with title “The Moon”, Hear, story, wow as today.
3. Hero area shows the usual photo gallery. A **Phases** action opens a full-card overlay with:
   - **Big moon face** — lit fraction follows `t`; dark terminator slides across.
   - **Phase name** (eight kid names) and **one short blurb** (why that bit is lit).
   - **Small top-down diagram** — Sun fixed, Earth center, Moon on a circle; drag the Moon or scrub a range input.
4. Face, diagram, name, and blurb stay in lockstep.
5. When the discrete phase **name** changes (not on every tiny drag tick), Luna plays the phase-name clip (same Speak stack as places). Rapid scrubbing: only the settled phase after drag end / after a **200 ms** debounce speaks, so Luna is not interrupted eight times in one swipe. Card “Hear” still plays the full Moon card clip and stops any in-flight phase clip (existing `stopSpeech` behavior).
6. Reduced motion: no auto-play orbit (there is none in v1). Drag and slider still work.
7. Closing the card unmounts the toy and stops phase speech if playing.

### Eight phases (canonical)

Bands are half-open `[start, end)` on `t ∈ [0, 1)`, except `new` which wraps across 0:

| `id` | Name | `t` band |
|------|------|----------|
| `new` | New Moon | `[0.9375, 1) ∪ [0, 0.0625)` |
| `waxing-crescent` | Waxing Crescent | `[0.0625, 0.1875)` |
| `first-quarter` | First Quarter | `[0.1875, 0.3125)` |
| `waxing-gibbous` | Waxing Gibbous | `[0.3125, 0.4375)` |
| `full` | Full Moon | `[0.4375, 0.5625)` |
| `waning-gibbous` | Waning Gibbous | `[0.5625, 0.6875)` |
| `last-quarter` | Last Quarter | `[0.6875, 0.8125)` |
| `waning-crescent` | Waning Crescent | `[0.8125, 0.9375)` |

Blurbs are short kid sentences (one line each), e.g. Full: “The whole sunny side faces Earth.” Exact blurb strings live in `moon-phases.js` constants and may be tuned without changing the API.

Geometry convention (fixed for tests):

- `t ∈ [0, 1)` is the Moon’s position on the orbit circle.
- `t = 0` → New Moon (Moon between Earth and Sun).
- `t = 0.5` → Full Moon (Earth between Sun and Moon).
- `litFraction = 0.5 - 0.5 * cos(2π t)` (0 at new, 1 at full).
- Lit face is the hemisphere toward the Sun; from Earth’s view that yields the classic phase silhouette.

## Architecture

```
space pick / strip → openLandmark / CardMedia.open(moon)
                         │
                         ├─ story / wow / Hear (unchanged)
                         └─ if id === "moon":
                              skip photo gallery
                              createMoonPhaseToy(heroEl, { onPhaseChange })
                                    │
                                    ├─ phaseFromTurn(t)  ← pure, tested
                                    ├─ SVG face + diagram + slider
                                    └─ speakPhase(phaseId) via Speak
```

### Module: `moon-phases.js`

**Pure (no DOM):**

- `phaseFromTurn(t)` → `{ id, name, blurb, litFraction, moonAngle }`
  - `t` wrapped into `[0, 1)`.
  - `litFraction` in `[0, 1]` for the face (see formula above).
  - `moonAngle` in radians for diagram placement (`2π t`, Sun fixed on the +x side).
- `PHASES` — ordered table of the eight phases (ids, names, blurbs, band edges).

**DOM factory:**

- `createMoonPhaseToy(container, opts)` → `{ setTurn(t), getTurn(), destroy() }`
  - Builds SVG moon face, orbit diagram, accessible range input, live region for phase name.
  - Pointer drag on orbit updates `t`; range input updates `t`.
  - Calls `opts.onPhaseChange?.(phase)` when `phase.id` changes (CardMedia wires speech here).
  - Does not import Globe, Solar3D, Speak, or quiz code.

### CardMedia changes

- In `buildGallery` / open path: if `lm.id === "moon"`, clear hero photo track and mount `createMoonPhaseToy` into the hero (or a dedicated child of the hero).
- Wire `onPhaseChange` to debounced `speakPhase(phase.id)` (200 ms) and also speak on `pointerup` if the phase changed since speech last fired.
- On close / open of another place: `destroy()` the toy and `stopSpeech()` if a phase clip is playing.
- Do not put quiz rules in CardMedia (ADR 0002). Moon-only branch is Place-id chrome, same class of exception as continent “Explore here”.

### Speak

- Bake eight name clips: `vendor/tts/clips/phase-<id>.name.mp3` (e.g. `phase-full.name.mp3`) with text like `"Full Moon."`.
- Add `speakPhase(phaseId)` to `speak.js`: plays `phase-${phaseId}.name.mp3` via the existing `playUrl` / `clipUrl` pattern (extend `clipUrl` or pass a composed id — implementation detail, one public export).
- Mute / sound-off: follow the same path as other Speak calls today (if speech currently ignores mute, do not invent new mute policy in this feature).
- Baking: extend `scripts/bake-speech.mjs` with the eight phase name strings. Commit the MP3s like other Luna clips.

### CSS

- Phase toy chrome lives in `toy.css`.
- Card-hero layout hooks that must share existing card tokens may add minimal selectors in `app.css` only if unavoidable.
- Terminator: SVG/CSS mask or rotating dark overlay — **not** a WebGL context.
- Do not merge `toy.css` into `app.css`.

### Out of scope (v1)

- Real calendar / ephemeris “today’s moon”.
- Syncing the Earth-sky 3D moon mesh or sun-drag to the toy.
- Auto-orbit play button.
- Replacing Space Solar3D moon rendering.
- Teaching eclipses, tides, or far-side geography beyond the phase blurb.
- New npm deps / bundler / second live WebGL.

## Testing

- `tests/moon-phases.check.js` — Node assert only, no jsdom:
  - `phaseFromTurn(0)` → `new`
  - `phaseFromTurn(0.5)` → `full`
  - `phaseFromTurn(0.25)` → `first-quarter`
  - `phaseFromTurn(0.75)` → `last-quarter`
  - wrapping: `phaseFromTurn(1)` / `phaseFromTurn(-0.01)` behave like `0`
  - every `id` in `PHASES` is unique; names non-empty
- Do not import `boot.js` or construct full CardMedia in Node.
- Human smoke: Space → Moon → drag through all eight names; Luna speaks on change; Hear still works; open another Place and confirm toy is gone.

## Global constraints (inherit)

- No bundler / no new npm deps
- Do not rebuild globe.gl / dual live Three
- Do not merge `toy.css` into `app.css`
- Do not recreate `chrome.js`
- ADR 0002: quiz rules stay out of Globe and CardMedia
- Content packs stay `window.*` / SpaceCatalog as today
- Node assert checks only — fake els, never jsdom
- After code commits: `graphify update .` with `required_permissions: ["all"]`

## Success criteria

- Kid can open Moon in Space and learn all eight phase names by dragging.
- Face and diagram never disagree.
- Luna speaks each phase name when it changes (debounced).
- No new WebGL context; phone-safe MP3 speech.
- Pure phase math covered by Node checks.
