# Space re-enter

Space re-enter keeps a Space tab click working even when a leave-to-Earth transition is still running, so a rapid Space → Earth → Space bounce still lands in the solar overview.

## Sub-features

- `reenter-during-leave` cancels an in-flight leave when Space is chosen again.
- `reenter-overview` ends on Space selected with `body.space-mode` and a visible sizes strip.
- `reenter-earth-ok` still allows a calm return to Landmarks afterward.

## How to get to it (user POV)

- Choose `Space`, then quickly choose an Earth tab (for example `Landmarks`), then choose `Space` again before the leave animation finishes.
- Or leave Space fully, then choose `Space` again immediately.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- `control-world-adventures browser ready` has succeeded.
- Start from Landmarks with Find closed and no place card open.

- **Prime Space.** Run `control-world-adventures browser click --role tab --name "Space"`. Wait until `document.body.classList.contains("space-mode")` is `true` and `#ssSizesRow .ss-size-item` exists.
- **Rapid bounce.** Run `control-world-adventures browser click --role tab --name "Landmarks"` and immediately run `control-world-adventures browser click --role tab --name "Space"` (no intentional sleep between the two clicks).
- **Confirm Space stuck the landing.** Run `control-world-adventures browser eval --js '({selected:document.getElementById("tabSpace").getAttribute("aria-selected"), spaceMode:document.body.classList.contains("space-mode"), solarHidden:document.getElementById("solarSystem").hidden, sizes:document.querySelectorAll("#ssSizesRow .ss-size-item").length})'`. Expect `selected` `true`, `spaceMode` `true`, `solarHidden` `false`, and `sizes` greater than `0`.
- **Proof.** Run `control-world-adventures browser snapshot --aria --path space-reenter/rapid.aria.txt` and `control-world-adventures browser screenshot --path space-reenter/rapid.png`. Artifacts show Space selected with solar-system chrome.
- **Calm leave.** Run `control-world-adventures browser click --role tab --name "Landmarks"`. Wait for `#strip .thumb[data-id="eiffel"]` and `space-mode` `false`.

## Gotchas

- The leave transition is short (~400ms). Issue the second Space click immediately after Landmarks; a long pause turns this into a normal re-enter, which is still fine but weaker proof.
- Do not open Find or a place card during the bounce — those chrome changes obscure the tab result.
- Pinch fluid handoff is a different path; this recipe is tab-only.
