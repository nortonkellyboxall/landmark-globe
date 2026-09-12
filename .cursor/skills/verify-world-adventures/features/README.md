# World Adventures verification map

This directory is the maintained source for verifying the user-facing behavior of World Adventures!. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `control-world-adventures launch` so the app is at `http://127.0.0.1:8765/` (or the `WA_PORT` you chose).
- Set a disposable `WA_STATE_DIR=/tmp/wa-verify-$RUN_ID` so concurrent runs do not share meta.
- Put `.cursor/skills/verify-world-adventures/bin` on `PATH`.
- Run `control-world-adventures doctor` and require `healthy: true` for the expected URL.
- Run `control-world-adventures browser ready` once per browser session before the first recipe step.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names (`Landmarks`, `Find this place`, `Surprise me`) over coordinates.
- Use `#strip .thumb[data-id="…"]` when the strip chip is the user control (chips use `title` = place name, not an accessible name).
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-world-adventures browser`.
- Cleanup removes the server and browser only. Do not remove proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the brand `World Adventures!` visible.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-world-adventures` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Open a place card](./place-card.md) covers strip and Surprise entry to the place dialog.
- [Adventure tabs](./adventure-tabs.md) covers switching Landmarks, Wonders, Continents, Countries, and Space.
- [Find quiz](./find-quiz.md) covers starting Find and seeing a prompt for the current pool.
- [Space mode](./space-mode.md) covers entering Space and opening a solar-system body card.
- [Moon phases](./moon-phases.md) covers opening the Phases toy on The Moon.
