# Domain context

## Glossary

- **Place** — A kid-facing record shown on the globe or in space (landmark, wonder, continent, country, or space body). Informal shape: `id`, `name`, `place`, `story`, `wow`, `photos`, optional `lat`/`lng`, `video`, `anthem`, `emoji`, `color`, `kind`.
- **SpaceCatalog** — Single source of truth for solar-system bodies: kid copy plus AU, orbital years, diameters, and 3D visual params. Views only render; they do not own body data.
- **Globe** — Earth view module: pins, night mode, camera. Callers use a small interface; they never touch globe.gl materials/scene directly.
- **CardMedia** — Place detail card: gallery, video/anthem, speech. Selection/fly-to stays outside.
- **Sound** — Ambient audio, whoosh, mute. WebAudio details stay inside the module.
- **Content pack** — Shallow `window.*` array file (`LANDMARKS`, `WONDERS`, `CONTINENTS`, `COUNTRIES`). Not deepened.
- **Continent join** — From a continent Place card, “Explore here” filters landmarks **and** natural wonders for that continent (Americas split N/S by latitude).
- **Speak** — Pre-baked Luna MP3 clips in `vendor/tts/clips/` (`speakCard` / `speakName`). MP3 for Safari/phone support. Rebake with `node scripts/bake-speech.mjs`.
- **Find quiz** — Guided “tap the matching pin” loop (`quiz.js`). Topbar 🔍. Keeps the full current place set on the globe (no decoy thinning). Session stars + persisted sticker collection live in `find-progress.js`.
