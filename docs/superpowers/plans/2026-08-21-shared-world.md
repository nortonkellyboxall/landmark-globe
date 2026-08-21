# Shared World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD. No extra WebGL. No React.

**Goal:** One Solar3D canvas for Earth and space; pinch is a camera move; Globe API preserved.

**Architecture:** Pure altitude/lat-lng helpers in `orbit-look.js`. Solar3D gains `earth`/`solar` view modes. `globe-app.js` drops globe.gl. `space-mode.js` only toggles chrome + view mode.

**Tech Stack:** Vanilla ES modules, Three.js (importmap), Node assert checks.

## Global Constraints

- No bundler / no React / no new npm deps
- One `WebGLRenderer`
- Keep `createGlobe` return shape
- ADR 0002
- Do not commit unless asked

## File map

See spec `docs/superpowers/specs/2026-08-21-shared-world-design.md`.

---

### Task 1: Camera math

**Files:** `orbit-look.js`, `tests/orbit-look.check.js`

- [x] Failing asserts for `povAltitudeFromDistance(6, 2) === 2`, `distanceFromPovAltitude(2, 2) === 6`, `directionToLatLng(...latLngDirection(lat,lng))` round-trip
- [x] Implement the three functions
- [x] `node tests/orbit-look.check.js` OK

### Task 2: Solar3D view mode

**Files:** `solar3d.js`

- [x] `setViewMode("earth"|"solar")`, `getViewMode()`
- [x] Follow Earth translation in `animate` when earth mode
- [x] `setEarthLook(lat,lng,alt,ms)`, `getEarthPov()`, `projectEarthLatLng(lat,lng)` → `{ x, y, visible }` CSS px or null
- [x] `setOnPov(cb)`, `setEarthNight(on)`
- [x] Earth mesh uses `textures/earth/earth-blue-marble.jpg` when available
- [x] Export the new functions
- [x] `init` must not run if `renderer` already exists for the same container (or space-mode never re-inits)

### Task 3: space-mode handoff without canvas swap

**Files:** `space-mode.js`, `tests/space-mode.check.js`

- [x] RED: enter calls `setViewMode("solar")` (or `playIntroZoom`), does **not** `globe.setActive(false)`; leave calls `setViewMode("earth")` (or `zoomToEarth`), does **not** `Solar3D.setActive(false)`
- [x] `ensure` inits on `els.globeViz`; skip init if `dataset.ready === "1"`
- [x] Do not toggle `hidden-view` on globeViz
- [x] GREEN space-mode check + existing checks

### Task 4: Globe adapter + chrome

**Files:** `globe-app.js`, `boot.js`, `index.html`, `app.css`, `CONTEXT.md`

- [x] `createGlobe` inits Solar3D on `el`, `setViewMode("earth")`, pin overlay
- [x] Remove globe.gl script tag
- [x] Space overlay `pointer-events: none` except sizes panel
- [x] Hide or omit `#ss3d`
- [x] Full `node tests/*.check.js`
