# Choice quiz

Multiple-choice Quiz beside Find: short spoken cues with 3–4 choices drawn from live packs, gentle wrongs, celebrate + Next on correct. Speech-first for pre-readers (auto-speak on round start).

## Sub-features

- `quiz-start` — Quiz button opens the choice prompt with a cue and choices; cue auto-speaks.
- `quiz-hear` — Hear / Luna re-speaks the question cue (and subject name when part of the ask).
- `quiz-wrong` — Wrong choice keeps the round active with soft spoken feedback.
- `quiz-correct-next` — Correct celebrates (spoken Yes + answer), shows Next, score tally updates.
- `quiz-exit` — × (or Escape) hides the prompt and leaves choice mode.

## How to get to it (user POV)

- Top-bar button **Start a quiz** (`#quizBtn`, title Quiz).
- Not started from Luna (Luna still starts Find when idle; while Quiz is active Luna re-speaks the question).

## Driving it with control-world-adventures

Preconditions:

- `control-world-adventures doctor` → `healthy: true`
- `control-world-adventures browser ready`

- Start Quiz: `control-world-adventures browser click --selector '#quizBtn'` → `#choicePrompt` is not `[hidden]`; `body` has class `choice-mode`; `#choiceOptions .choice-option` count ≥ 3.
- Read cue: `control-world-adventures browser text --selector '#choiceCue'`
- Hear: `control-world-adventures browser click --selector '#choiceHear'` (re-speaks cue; no DOM assert required beyond prompt still open).
- Wrong tap: click a `.choice-option` whose `data-id` is not the correct answer (use eval to pick) → cue becomes almost/try again; prompt still open.
- Correct tap: click the option matching the active correct id → `#choicePrompt` has class `found`; `#choiceNext` is not hidden.
- Next: `control-world-adventures browser click --selector '#choiceNext'` → new cue/choices.
- Exit: `control-world-adventures browser click --selector '#choiceExit'` → `#choicePrompt` hidden; `choice-mode` removed.

## Gotchas

- Quiz uses the **full Earth catalog**, not the active strip pool — do not assert strip-only ids.
- Starting Quiz stops Find; starting Find stops Quiz.
- Space tab switches the pool to star/planet/moon bodies.
- Flag/language templates need country Places; language questions only use countries with `Place.language`.
