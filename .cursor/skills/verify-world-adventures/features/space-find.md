# Space Find

Space Find keeps the solar overview, highlights the target body on the planet sizes strip, never prompts the ISS, and on a correct tap stays in Space (cheer punch does not snap the camera back to Earth).

## Sub-features

- `space-find-start` opens Find while the Space tab is selected.
- `space-find-target` marks the prompted body on `#ssSizesRow` with `.find-target` and never uses id `iss`.
- `space-find-correct` wins by tapping the matching strip chip (or sizes row) for that body.
- `space-find-stay` keeps `body.space-mode` after the win (no Earth punch snap).

## How to get to it (user POV)

- Choose the `Space` tab, then `Find this place` (or Luna when idle on Space).
- Tap the highlighted body on the Place shortcuts strip or the sizes strip.
- After a win, stay exploring Space or choose `Find another` / `Stop finding`.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- `control-world-adventures browser ready` has succeeded.
- Find is not already active (`#findPrompt` is hidden).
- Place card is closed.

- **Enter Space.** Run `control-world-adventures browser click --role tab --name "Space"`. Wait until `document.body.classList.contains("space-mode")` is true and `#ssSizesRow .ss-size-item` exists.
- **Start Find.** Run `control-world-adventures browser click --role button --name "Find this place"`. Then `control-world-adventures browser wait --selector '#findPrompt:not([hidden])'`.
- **Confirm cue.** Run `control-world-adventures browser text --selector '#findCue'`. Expect `Find this!`.
- **Resolve target + assert not ISS.** Run `control-world-adventures browser eval --js 'const hit=document.querySelector("#ssSizesRow .ss-size-item.find-target"); JSON.stringify({id:hit&&hit.getAttribute("data-id"), hasFindTarget:!!hit, stripHasIss:!!document.querySelector("#strip .thumb[data-id=\\"iss\\"]"), sizesIss:document.querySelectorAll("#ssSizesRow [data-id=\\"iss\\"]").length, spaceMode:document.body.classList.contains("space-mode")})'`. Expect JSON with a non-null body `id` that is not `iss`, `hasFindTarget` `true`, `stripHasIss` `false`, `sizesIss` `0`, `spaceMode` `true`.
- **Correct tap.** Prefer the strip chip: `control-world-adventures browser click --selector '#strip .thumb[data-id="<id>"]' --force` (scroll is automatic). Alternate: `#ssSizesRow .ss-size-item[data-id="<id>"]`. Then wait on `#findAgain:not([hidden])` and cue text `You found it!` or `You found them all!`.
- **Assert still Space.** Run `control-world-adventures browser eval --js 'JSON.stringify({spaceMode:document.body.classList.contains("space-mode"), solarHidden:document.getElementById("solarSystem").hidden, selected:document.getElementById("tabSpace").getAttribute("aria-selected")})'`. Expect `spaceMode` `true`, `solarHidden` `false`, `selected` `true`.
- **Proof.** Run `control-world-adventures browser snapshot --aria --path space-find/win.aria.txt` and `control-world-adventures browser screenshot --path space-find/win.png`. Artifacts show Space selected, found cue, and Find another.
- **Stop (optional).** Close the card if open, then `control-world-adventures browser click --role button --name "Stop finding"` and wait until `#findPrompt` is hidden.

## Gotchas

- Earth Find recipes live in [find-quiz](./find-quiz.md); do not mix Landmarks pool asserts into this file.
- Sizes-strip highlight uses class `find-target` only while the prompt is active before the win.
- Off-screen body chips need `--force` or sizes-row entry (same scroll helper as other recipes).
- Punch is a no-op off Earth — if `space-mode` drops after a correct tap, treat that as a product regression, not a harness flake.
- ISS is never a Space Find target ([iss-card](./iss-card.md)).
