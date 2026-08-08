# Find Quiz

Status: ready-for-human (v1 shipped)

## Goal

Help kids who can’t read yet **learn to find places on the globe** by playing short “find this” rounds — not text quizzes.

## Kid loop (v1)

1. Tap **🔍 Find** in the top bar (hidden in Space).
2. App picks one Place from the **current adventure set** (all pins stay on the globe — options are not thinned).
3. Prompt shows **big emoji + photo**. 🔊 hears the name. × exits.
4. Kid taps pins on the globe (or strip):
   - Right → chime, “You found it!”, Place card opens, **🔁 Again**
   - Wrong → soft boop + pin shake; keep trying
5. Switching adventure / entering Space / Escape cancels the round.

## Module

`quiz.js` — round state. Boot wires chrome + globe taps.

## Not in v1

Streaks, space quiz, persistence, timed scoring.
