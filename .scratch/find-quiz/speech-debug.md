# Speech debug notes (2026-08-08)

## Symptom
Card **Hear it** and Find **🔊** produce no audible speech after speak.js extraction.

## Feedback loop
Cursor IDE Chromium against `http://127.0.0.1:8000`:
1. Open landmark → click `#speakBtn`
2. Read `speechSynthesis.speaking` + utterance `onstart`

**Result in Chromium:** GREEN — `onstart` fires, `speaking: true`, voice `Karen` (en-AU local).

Could **not** reproduce silence in this environment. User failure is therefore engine/environment-specific (likely Safari / WebKit cancel race), not “click never calls speakText”.

## Trace
`#speakBtn` / `#findHear` → `speakText()` → `cancel()` → `speak(utt)`.

Cancel callers while testing Find: `card.close()` (expected on startFindQuiz), then `speakText`’s own cancel.

## Hypotheses
| # | Hypothesis | Evidence |
|---|------------|----------|
| H1 | Click never reaches speakText | REJECTED in Chromium (speak-request + onstart logged) |
| H2 | Stale cached Voice object | PLAUSIBLE — we had cached Voice; fixed by re-resolving at speak-time |
| H3 | Safari async `cancel()` drops the next `speak()` | PLAUSIBLE — known WebKit bug; Chromium does not reproduce; fix = retry if idle after 120ms |
| H4 | setTimeout-only speak loses user gesture | Was a prior regression; already removed as primary path |

## Fix applied
1. No cached Voice objects — pick from `getVoices()` each speak, re-resolve by name.
2. Speak immediately in the click turn; if still not `speaking`/`pending` after 120ms, speak again (Safari cancel race).
3. Cache-bust `boot.js?v=speech3` so the browser isn’t stuck on an old module.
