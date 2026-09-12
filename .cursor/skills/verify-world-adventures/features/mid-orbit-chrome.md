# Mid-orbit chrome

Mid-orbit chrome keeps Earth Place shortcuts and pins usable while the camera is zoomed out below the Space handoff altitude, so Find and strip taps still work before solar handoff.

## Sub-features

- `mid-orbit-pov` places the Earth camera at a mid altitude (about 10 radii) without entering Space.
- `mid-orbit-strip` keeps `#strip` place chips available (`body.deep-space` is off).
- `mid-orbit-open` opens a landmark card from the strip at that altitude.
- `mid-orbit-not-space` keeps `body.space-mode` false until handoff altitude is crossed.

## How to get to it (user POV)

- Pinch the Interactive Earth outward into a high Earth orbit without crossing into Space.
- Scripts set the same camera altitude with the harness POV helper.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- Landmarks tab is active (not Space).
- `control-world-adventures browser ready` has succeeded.
- Find is closed and the place card is hidden.

- **Set mid altitude.** Run `control-world-adventures browser pov --lat 18 --lng -18 --altitude 10 --ms 0`. Expect JSON with `altitude` near `10`, `deepSpace` `false`, `spaceMode` `false`, and `stripVisible` `true`.
- **Confirm strip.** Run `control-world-adventures browser wait --selector '#strip .thumb[data-id="eiffel"]'`. The Eiffel chip is present.
- **Open from strip.** Run `control-world-adventures browser click --selector '#strip .thumb[data-id="eiffel"]'`, then `control-world-adventures browser wait --selector '#card:not([hidden])'`, then `control-world-adventures browser text --selector '#cardTitle'`. The title is `Eiffel Tower`.
- **Proof.** Run `control-world-adventures browser snapshot --aria --path mid-orbit-chrome/mid.aria.txt` and `control-world-adventures browser screenshot --path mid-orbit-chrome/mid.png`. Artifacts show the open card and Landmarks chrome (not Space).
- **Restore near view (optional).** Run `control-world-adventures browser pov --altitude 2.45 --ms 0` so later recipes are not left mid-orbit.

## Gotchas

- Space handoff altitude is above mid-orbit. Setting `--altitude` past handoff (about 16+) can fluid-enter Space if pinch handoff is armed — use `10` for this recipe.
- `body.deep-space` hiding the strip is for past-handoff / Space chrome, not mid-orbit. Assert `deepSpace` false here.
- Do not confuse this with [space-mode](./space-mode.md); mid-orbit stays on Earth.
- POV goes through Solar3D; wait for the returned JSON before asserting DOM classes.
