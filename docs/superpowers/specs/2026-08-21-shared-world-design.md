# Shared 3D world — design

**Date:** 2026-08-21  
**Status:** slice 1 shipped (fluid Earth↔space zoom)  
**Later slices:** 3D curiosities on Earth (ISS as mesh, landmark peek); visit other worlds (nested surface scale)

## Goal

Kids stay in **one WebGL world**. Pinching out from Earth is a camera move among the planets, not a swap from globe.gl to a second Three.js canvas.

## Why

Curious 3D (land on Mars, fly rings, ISS, landmark toys) cannot stack on two engines. Nested scales come later; this slice is the shared renderer.

## Out of scope (this slice)

- React / React Three Fiber / a bundler
- Planet-surface scale (Mars walk, rings fly-through)
- 3D landmark models on Earth
- JSON content packs, extra npm deps

**Restored after slice 1:** globe.gl visual parity (aurora, clouds, bump, radar, weather, sun-drag) on the shared Earth mesh via `earth-surface.js`.

## Constraints

- One live `WebGLRenderer` (the existing Solar3D module)
- Vanilla ES modules + importmap
- Globe **interface** stays (`setPlaces`, `pointOfView`, `setNight`, `setAutoRotate`, `punch`, `setSunHours`, `setWeather`, `lockRadar`, `setActive`) so boot / Find / adventure do not grow a second 3D API
- ADR 0002: quiz rules stay out of Globe
- SpaceCatalog still owns body data; Solar3D only renders
- Phones: keep `setPixelRatio` cap 2; pause when the page is hidden

## Kid experience (slice 1)

1. Landmarks / wonders / countries / continents: camera sits close to **Earth in the solar system**, pins on the surface, drag to orbit Earth, auto-rotate as today.
2. **Pinch / dolly out** past handoff altitude: Space chrome (sizes strip) appears; the **camera keeps its place** and zoom range opens into the solar system — no leap to a sun overview. Orbit target soft-blends from Earth toward the Sun as altitude rises (`sunTargetBlend`). Zooming back in restores Earth chrome without a fly-to snap. Zoom handoffs are quiet (no fly-whoosh).
3. **Tab Space**: gentle overview tween to the sun-centered solar view (`playIntroZoom` / `setViewMode({ animate })`). Same canvas; whoosh is OK here.
4. Tap a planet: Place card as today. Tap a pin: Place card as today.

## Architecture

```
#globeViz  →  single Solar3D canvas + HTML pin overlay
#solarSystem → chrome only (sizes, orbit-mode). No second WebGL.
```

**View modes** (Solar3D):

| Mode | Camera | Controls |
|------|--------|----------|
| `earth` | Follows Earth translation; target = Earth; distance maps to globe.gl `altitude` | Orbit Earth, no pan, min/max distance = globe range |
| `solar` + `fluid: true` | Keep current camera; target blends Earth→Sun by altitude; max distance opens | Continuous dolly; pan unlocks when blend is high |
| `solar` + overview | Sun-centered HOME/REAL cam via intro zoom | Orbit sun, pan allowed |

Handoff from pinch is `setViewMode("solar", { fluid: true })` + Space chrome — **not** `playIntroZoom`, and not dual `setActive` canvas swap. Tab Space uses overview animate. Leave via zoom uses `{ fluid: true }` / `{ quiet: true }` so the camera stays put.

**Altitude mapping** (Earth radius `R` = catalog `visual.size`, currently 2):

- `altitude = distance / R - 1` (globe.gl convention: 0 = surface)
- `distance = (altitude + 1) * R`
- `SPACE_HANDOFF_ALT = 16`, `SPACE_RETURN_ALT = 13` (hysteresis)
- `sunTargetBlend(alt)`: 0 at handoff → 1 at handoff + 24

**Pins:** HTML `.pin` nodes in a `.pin-layer` on `#globeViz`. Each frame, project Earth-local lat/lng (existing `latLngDirection`) through the camera. Hide when the point faces away. ISS stays a traveler pin via `travelerPos`.

**Earth look:** blue-marble + bump (`textures/earth/earth-topology.png`) + CDN night cities/clouds. Atmosphere shell and cloud opacity follow `lookFromAltitude`. Aurora curtains track the night side (shifted by `setSunHours`). `setWeather` / `lockRadar` are Earth-mesh children (not stubs). Decorative sky Sun/Moon stay out — the solar scene already has them. `setSunHours` yaws Earth so the terminator moves under the real Sun.

## Module map

| File | Change |
|------|--------|
| `orbit-look.js` | `directionToLatLng`, `povAltitudeFromDistance`, `distanceFromPovAltitude`, `sunTargetBlend`, handoff/return alts |
| `earth-fx.js` | Pure `earthLocalPos`, `sunYawRadians`, `auroraNightLng`, `fxScale` |
| `earth-surface.js` | Clouds, bump/night maps, atmosphere, aurora, weather, radar on Earth mesh |
| `solar3d.js` | View modes + Earth surface FX tick; exports `setWeather` / `lockRadar` / `setSunHours` / `setEarthLookBand` |
| `globe-app.js` | Adapter over Solar3D + pin overlay; wires Globe API to surface FX |
| `space-mode.js` | Init/reuse the globeViz world; chrome only; `enter({ overview\|fluid })`, quiet leave |
| `adventure.js` | `switchTab(tab, { fluid, quiet, overview })` |
| `index.html` | Drop `globe.gl.min.js`; `#ss3d` unused/removed |
| `app.css` | Pin layer; space chrome does not steal pointer events from the canvas |
| `CONTEXT.md` | Globe = shared-world adapter + surface FX |
| `tests/orbit-look.check.js` | Mapping + inverse lat/lng + blend |
| `tests/earth-fx.check.js` | Local pos + sun yaw + aurora night lng |
| `tests/space-mode.check.js` | Handoff is view-mode, not dual `setActive` |

## Risks

- Earth `R=2` at 1 AU is tiny; globe mode is a close camera, which is intended.
- Following Earth while it orbits: each frame add `earthDelta * (1 - blend)` to the camera (do not parent the camera — OrbitControls owns it).
- Re-`init` of Solar3D calls `destroy()`. Globe boots the world; space-mode `ensure` must no-op if already ready.
