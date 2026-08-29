# Find Quiz

Status: ready-for-human (v1 shipped; Space Find cues in scope)

## Goal

Help kids who can’t read yet **learn to find places on the globe** (and bodies in Space) by playing short “find this” rounds — not text quizzes.

## Kid loop (v1)

1. Tap **🔍 Find** in the top bar.
2. App picks one Place from the **current adventure set** (all pins stay on the globe — options are not thinned). On Space, the pool is stars/planets/moons (not ISS).
3. Prompt shows **big emoji + photo**. 🔊 hears the name. × exits.
4. Kid taps pins on the globe (or strip), or size-strip items in Space:
   - Right → chime, “You found it!”, Place card opens, **🔁 Again**
   - Wrong → soft boop + pin shake; keep trying
5. Switching adventure / entering Space / Escape cancels the round. Starting Find while already on Space keeps the Space view and highlights the target body on the sizes strip (`find-target`) plus `spaceMode.highlight`.

## Module

`quiz.js` — round state. `find-game.js` — prompt, stickers, heat, Space size-strip cue. Boot wires chrome + globe taps; `highlightTarget` goes to `spaceMode.highlight`. Quiz rules stay out of Globe / Solar3D.

## Not in v1

Timed scoring. Earth heat/radar in Space. ISS in the Find pool.
