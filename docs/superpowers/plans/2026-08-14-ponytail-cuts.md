# Ponytail Cuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Checkboxes track progress.

**Goal:** Delete dead runtime deps and one-caller wrappers from the 2026-08-14 ponytail-audit.

**Architecture:** Same vanilla ES modules. No new files. Deletion only, plus inlining `chrome.js` into `boot.js`.

**Tech Stack:** Vanilla JS, Node assert checks, existing vendor.

## Global Constraints

- No bundler / no new npm deps
- Do not rebuild globe.gl / dual Three (prior attempt broke the globe)
- Do not merge `toy.css` into `app.css` (visual risk)
- Keep `vendor/tts/clips/`, `vendor/tts/model/`, `scripts/bake-speech.mjs`
- Keep `skyBodyClearOfGlobe` (moon-distance check)
- Do not commit unless asked

## Files

- Delete: `chrome.js`, `vendor/tts/kitten-tts.bundle.js`, `vendor/tts/ort.wasm.min.mjs`, `vendor/tts/ort-wasm-simd-threaded.mjs`, `vendor/tts/ort-wasm-simd-threaded.wasm`
- Modify: `boot.js`, `globe-app.js`, `orbit-look.js`, `space-catalog.js`, `quiz.js`, `index.html`, `app.css`, `toy.css`, `vendor/tts/NOTICE.txt`
- Test: `tests/orbit-look.check.js`, `tests/space-catalog.check.js`, `tests/quiz.check.js`

---

### Task 1: Dead TTS runtime

Bake uses `scripts/node_modules` + `vendor/tts/model`. Browser bundle and ONNX WASM are unreferenced.

- [x] Delete the four runtime files
- [x] Trim `NOTICE.txt` so it no longer claims `kitten-tts.bundle.js` is shipped
- [x] Verify no remaining imports: `rg kitten-tts.bundle|ort-wasm vendor/tts --glob '!clips/**'`

### Task 2: CSS aurora overlay

3D curtains in `globe-app.js` stay. CSS overlay goes.

- [x] Remove `<div class="aurora">` from `index.html`
- [x] Remove `.aurora` rules and `@keyframes auroraDrift` from `app.css` / `toy.css`
- [x] Drop `.aurora` from the reduced-motion selector list

### Task 3: Inline chrome.js

- [x] In `boot.js`, replace `createChrome` with:

```js
function setPanelOpen(panel, btn, open) {
  if (!panel || !btn) return;
  panel.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", String(open));
}
```

- [x] Replace `closeChromeMenus()` with `setPanelOpen(els.settingsPanel, els.settingsBtn, false)`
- [x] Delete `chrome.js`

### Task 4: Dead helpers

- [x] Delete `sunOffset` from `orbit-look.js`; drop its asserts from `tests/orbit-look.check.js`
- [x] Delete `orbitRadiusPct` from `space-catalog.js`
- [x] Un-export `getBody` (keep as a local used by `diameterKm`)
- [x] Update `tests/space-catalog.check.js` to use `SPACE_BODIES.find` / `diameterKm("earth")`
- [x] In `quiz.js` `start()`, use `list` instead of `pinSetForRound(target, list)`; delete `pinSetForRound`
- [x] Point `tests/quiz.check.js` at `geoPool` only

### Task 5: Debug hooks + sound aliases

- [x] Remove `window.skyDebug`, `window.lookSky`, and `globe.skyDebug()`
- [x] Replace the five `const playX = () => sound.playX()` lines with `const { playPop, playChime, playFanfare, playBoop, playFlyWhoosh } = sound;`

### Task 6: Verify

```bash
node tests/orbit-look.check.js
node tests/space-catalog.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/place-weather.check.js
node tests/traveler-orbit.check.js
```

Each prints `*.check.js OK`. Then `graphify update .`

- [x] Six node checks
- [x] graphify update .

## Skipped

- Dual Three.js: last steal of globe.gl constructors caused `GL_INVALID_ENUM`
- Folding `toy.css` into `app.css`: cascade/visual risk, unique toy rules still needed
