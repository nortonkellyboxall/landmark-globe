# Choice quiz

Multiple-choice Quiz beside Find: short cues with 3–4 Place choices drawn from live packs, gentle wrongs, celebrate + Next on correct.

## Sub-features

- `quiz-start` — Quiz button opens the choice prompt with a cue and choices.
- `quiz-wrong` — Wrong choice keeps the round active with soft feedback.
- `quiz-correct-next` — Correct celebrates, shows Next, score tally updates.
- `quiz-exit` — × (or Escape) hides the prompt and leaves choice mode.

## How to get to it (user POV)

- Top-bar button **Start a quiz** (`#quizBtn`, title Quiz).
- Not started from Luna (Luna still starts Find when idle).

## Driving it with control-world-adventures

Preconditions:

- `control-world-adventures doctor` → `healthy: true`
- `control-world-adventures browser ready`

- Start Quiz: `control-world-adventures browser click --selector '#quizBtn'` → `#choicePrompt` is not `[hidden]`; `body` has class `choice-mode`; `#choiceOptions .choice-option` count ≥ 3.
- Read cue: `control-world-adventures browser text --selector '#choiceCue'`
- Wrong tap: click a `.choice-option` whose `data-id` is not the correct answer (use eval to pick) → cue becomes almost/try again; prompt still open.
- Correct tap: click the option matching the active correct id → `#choicePrompt` has class `found`; `#choiceNext` is not hidden.
- Next: `control-world-adventures browser click --selector '#choiceNext'` → new cue/choices.
- Exit: `control-world-adventures browser click --selector '#choiceExit'` → `#choicePrompt` hidden; `choice-mode` removed.

## Gotchas

- Quiz uses the **full Earth catalog**, not the active strip pool — do not assert strip-only ids.
- Starting Quiz stops Find; starting Find stops Quiz.
- Space tab switches the pool to star/planet/moon bodies.
