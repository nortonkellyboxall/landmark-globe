# Speech clips

Pre-baked Luna **MP3** narration for every place (`*.card.mp3` + `*.name.mp3`).
MP3 (not Opus) so Safari / iPhone / other LAN devices can play them.

Regenerate after changing place copy:

```bash
node scripts/bake-speech.mjs
```

Requires `ffmpeg` on PATH and `npm install` under `scripts/` (gitignored).
