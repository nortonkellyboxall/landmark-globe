# Domain context

## Glossary

- **Place** — A kid-facing record shown on the globe or in space (landmark, wonder, continent, country, or space body). Informal shape: `id`, `name`, `place`, `story`, `wow`, `photos`, optional `lat`/`lng`, `video`, `anthem`, `emoji`, `color`, `kind`.
- **SpaceCatalog** — Single source of truth for solar-system bodies: kid copy plus AU, orbital years, diameters, and 3D visual params. Views only render; they do not own body data.
- **Globe** — Earth view module: pins, night mode, camera. Callers use a small interface; they never touch globe.gl materials/scene directly.
- **CardMedia** — Place detail card: gallery, video/anthem, speech. Selection/fly-to stays outside.
- **Sound** — Ambient audio, whoosh, mute. WebAudio details stay inside the module.
- **Content pack** — Shallow `window.*` array file (`LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`). Not deepened.
- **Continent join** — From a continent Place card, “Explore here” filters landmarks **and** natural wonders for that continent (Americas split N/S by latitude).
- **Speak** — Pre-baked Luna MP3 clips in `vendor/tts/clips/` (`speakCard` / `speakName` / `speakPhase`). MP3 for Safari/phone support. Rebake with `node scripts/bake-speech.mjs`.
- **Find quiz** — Guided “tap the matching pin” loop. Round rules live in `quiz.js` (`createFindQuiz`). Prompt, pool, stickers, heat, and card-resume live in the Find quiz module (`find-game.js`). Globe and CardMedia stay free of quiz rules (ADR 0002).
- **Space handoff** — Earth↔space transition: pinch-arm, enter/leave timing, dual-view visibility, sizes strip. `solar3d.js` only renders.
- **Adventure navigation** — Active tab, current Place pool, strip, and Continent join. Not `chrome.js`.
- **Ambient kind** — `'on' | 'duck'`. Sound plays full pads when kind is `'on'` (space tab or a Place is selected); otherwise ducks. Sound does not know tab names.
- **Moon phases toy** — Interactive teacher on The Moon Place card in Space: shared orbit turn `t`, big moon face + Earth–Moon–Sun diagram, eight phase names. Math and DOM in `moon-phases.js`. CardMedia mounts it when `id === "moon"`; Luna speaks via `speakPhase`. Not tied to real calendar or Earth sun-drag.
