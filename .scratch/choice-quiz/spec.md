# Choice quiz (multiple choice)

Status: ready-for-agent → shipping

## Goal

A kid-facing multiple-choice quiz that draws questions from **all Earth Places** already on the globe (landmarks, wonders, continents, countries) — not hardcoded demo questions. Space tab uses star/planet/moon bodies.

## Kid loop

1. Tap **❓ Quiz** in the top bar (beside Find).
2. Prompt shows a short cue + emoji (photo when helpful) and **3–4 big choice buttons**.
3. Wrong → soft boop, gentle “Almost — try again!”, Luna oops; keep the same question.
4. Correct → fanfare, brief celebrate, score tally, **Next**.
5. × / Escape / adventure tab change exits. Starting Quiz stops Find (and the reverse).

## Module split

- `choice-quiz.js` — pool filters, continent join keys, question builders, round engine.
- `choice-game.js` — prompt chrome, choices DOM, score, Luna moods.
- Boot wires the Quiz button; Globe/CardMedia stay free of quiz rules (same ADR 0002 spirit as Find).

## Design choice

Quiz uses the **full Earth catalog**, not the active adventure strip. Find stays strip/tab-scoped (tap-the-pin). Documented in the PR so operators can prefer strip-scoped Quiz later if wanted.
