# Domain context

## Glossary

- **Place** — A kid-facing record shown on the globe or in space (landmark, wonder, continent, country, or space body). Shape is the JSDoc typedef in `place.js`: `id`, `name`, optional `place`, `story`, `wow`, `photos`, `lat`/`lng`, `video`, `anthem`, `emoji`, `color`, `kind`, `continent`. Lookup: `placeById` / `allPlaces`. Space bodies may carry extra SpaceCatalog fields (`au`, `visual`, …); views still must not own body data.
- **SpaceCatalog** — Single source of truth for solar-system bodies: kid copy plus AU, orbital years, diameters, and 3D visual params. Views only render; they do not own body data.
- **Globe** — Earth look over the shared Solar3D world: pins, night mode, camera, clouds/bump/aurora, Find radar, place weather, sun-drag hours. Callers use a small interface; they never touch Three.js materials/scene directly. Space handoff is a camera view-mode change, not a second WebGL context.
- **CardMedia** — Place detail card: gallery, video/anthem, speech. Selection/fly-to stays outside.
- **Sound** — Ambient audio, whoosh, mute. WebAudio details stay inside the module.
- **Content pack** — Shallow ES-module array (`LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`). Re-exported from `place.js`. Not deepened.
- **Continent join** — From a continent Place card, “Explore here” filters landmarks **and** natural wonders for that continent (Americas split N/S by latitude).
- **Speak** — Pre-baked Luna MP3 clips in `vendor/tts/clips/` (`speakCard` / `speakName` / `speakPhase`). MP3 for Safari/phone support. Rebake with `node scripts/bake-speech.mjs`.
- **Find quiz** — Guided “tap the matching pin” loop. Round rules live in `quiz.js` (`createFindQuiz`). Prompt, pool, stickers, heat, and card-resume live in the Find quiz module (`find-game.js`). Globe and CardMedia stay free of quiz rules (ADR 0002).
- **Space handoff** — Earth↔space transition: pinch-arm, enter/leave timing, sizes strip, orbit-mode toggle (real AU ↔ √ relative elliptical). One shared Solar3D canvas; `setViewMode("earth"|"solar")` moves the camera. `solar3d.js` only renders.
- **Adventure navigation** — Active tab, current Place pool, strip, and Continent join. Not `chrome.js`.
- **Ambient kind** — `'on' | 'duck'`. Sound plays full pads when kind is `'on'` (space tab or a Place is selected); otherwise ducks. Sound does not know tab names.
- **Moon phases toy** — Interactive teacher on The Moon Place card in Space: photo gallery stays; **Phases** opens a full-card overlay (face + Earth–Moon–Sun diagram, shared turn `t`, eight names). Math and DOM in `moon-phases.js`; CardMedia mounts on button; Luna speaks via `speakPhase`. Not tied to real calendar or Earth sun-drag.
