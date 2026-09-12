# Speech clips

Pre-baked Luna **MP3** narration for every place (`*.card.mp3` + `*.name.mp3`).
MP3 (not Opus) so Safari / iPhone / other LAN devices can play them.

`manifest.json` lists place ids and a `hashes` map: SHA-256 of the source text for each `id.kind` clip (including `phase-*.name`). `tests/speak-clips.check.js` fails when copy drifts without a rebake.

Regenerate after changing place copy:

```bash
node scripts/bake-speech.mjs
```

Requires `ffmpeg` on PATH and `npm install` under `scripts/` (gitignored). Skips only when the MP3 exists and its hash still matches. To stamp hashes for already-baked MP3s without TTS:

```bash
node scripts/bake-speech.mjs --record-hashes-only
```
