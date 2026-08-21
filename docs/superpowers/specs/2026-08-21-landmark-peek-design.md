# Landmark peek dive — design

**Date:** 2026-08-21  
**Status:** draft for review  
**Branch target:** feature work off `main`

## Goal

When a kid taps an Earth Place pin, the camera **dives closer** than today’s fly-to and **finishes** facing that spot; only then does the Place card open. Feels like a peek at the place, not a card appearing mid-flight.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Trigger | Every Earth pin tap that already flies (`openLandmark`, not Find `skipFly`) |
| Shape | Deeper single `pointOfView` / `setEarthLook` tween (approach A) |
| Card timing | Open **after** the dive completes |
| Space | Unchanged — Space opens card on a short delay, no Earth dive |
| Models / billboards | Out of scope |
| Two-beat / zoom-out after card | Out of scope |

## Kid experience

1. Kid is on Landmarks, Wonders, Countries, or Continents.
2. Taps a pin (or strip / surprise that calls `openLandmark`).
3. Whoosh + Luna name speech as today (if sound on).
4. Camera dives to the Place at a **lower peek altitude** than today’s fly-to; weather at that lat/lng still starts with the dive.
5. When the dive **ends**, the Place card opens.
6. Find: wrong pin ignored; correct pin still `skipFly` (no dive, card soon after).
7. ISS: unchanged (pop / cheer, no card).
8. Reduced motion: snap to peek altitude (0 ms), then open card immediately.

## Peek altitudes

Replace today’s tab altitudes with closer peeks:

| Tab | Today | Peek |
|-----|-------|------|
| landmarks / wonders (default) | 1.55 | **1.05** |
| countries | 1.35 | **0.95** |
| continents | 1.9 | **1.25** |

Duration stays `diveMs(fromAlt, peekAlt)` in `orbit-look.js` (already scales with altitude delta).

## Architecture

```
pin / strip / surprise
        │
        ▼
   openLandmark(id)          boot.js
        │
        ├─ Find gate / Space early return (unchanged)
        ├─ select chrome, weather, whoosh, speakName
        │
        ▼
   peekAltitudeForTab(tab)   orbit-look.js (pure)
        │
        ▼
   globe.pointOfView(lat, lng, peekAlt, ms)
        │  (Solar3D setEarthLook promise)
        ▼
   card.openPlaceCard(lm)    only after tween resolves
```

- **Pure helper:** `peekAltitudeForTab(tab)` in `orbit-look.js` (+ asserts in `tests/orbit-look.check.js`).
- **Wire:** `boot.js` `openLandmark` — await / `.then` on the fly path; remove mid-flight `setTimeout(..., ms * 0.62)` card open.
- **Globe:** `pointOfView` already delegates to `Solar3D.setEarthLook`, which returns a Promise when `ms > 0`. Ensure the adapter returns that Promise to callers (today `createGlobe.pointOfView` may not forward it — fix if needed).
- No new modules, no new WebGL meshes, ADR 0002 unchanged (quiz stays out of Globe).

## Edge cases

| Case | Behavior |
|------|----------|
| Reduced motion | `ms = 0`; card opens on next microtask / immediate then |
| Dive interrupted by another pin | Latest `openLandmark` wins; prior card open cancelled (ignore stale promise) |
| Already near peek alt | Short `diveMs`; still wait for completion before card |
| Tab Space | No peek dive |
| No globe | Early return as today |

## Out of scope

- 3D landmark models or photo billboards on the mesh  
- Two-stage dive or easing altitude back up under the open card  
- Changing Find, Space, or ISS flows beyond card-after-dive on Earth  
- New content packs or bundler

## Success

- Earth pin tap: camera finishes close, **then** card appears (no mid-dive card).  
- Peek is visibly closer than pre-change fly-to.  
- Reduced motion and Find `skipFly` still feel snappy.  
- `node tests/orbit-look.check.js` covers `peekAltitudeForTab`.
