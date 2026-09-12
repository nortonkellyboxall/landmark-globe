# Space mode

Space mode swaps the earth adventure for the interactive solar system, with a sizes strip of bodies the kid can open into place cards.

## Sub-features

- `space-enter` shows the solar-system stage from the Space tab.
- `space-strip` lists bodies such as The Sun and The Moon in the shortcut strip.
- `space-open-body` opens a body place card from the strip.
- `space-leave` returns to an earth tab and restores earth pins.

## How to get to it (user POV)

- Choose the `Space` tab in `Pick an adventure`.
- Pinch the globe out until the space handoff triggers (prefer the tab for scripts).

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- `control-world-adventures browser ready` has succeeded.

- **Enter Space.** Choose Space. Run `control-world-adventures browser click --role tab --name "Space"`. Run `control-world-adventures browser eval --js '({selected:document.getElementById("tabSpace").getAttribute("aria-selected"), solarHidden:document.getElementById("solarSystem").hidden})'`. Expect `selected` `true` and `solarHidden` `false`.
- **Open The Moon.** Choose the Moon chip. Run `control-world-adventures browser click --selector '#strip .thumb[data-id="moon"]'`, then `control-world-adventures browser wait --selector '#card:not([hidden])'`, then `control-world-adventures browser text --selector '#cardTitle'`. The title is `The Moon`.
- **Leave Space.** Choose Landmarks. Run `control-world-adventures browser click --role tab --name "Landmarks"`. Wait for `#strip .thumb[data-id="eiffel"]`. `tabLandmarks` is selected.
- **Proof.** Re-enter Space with The Moon card open (or sizes strip visible), then run `control-world-adventures browser snapshot --aria --path space-mode/moon.aria.txt` and `control-world-adventures browser screenshot --path space-mode/moon.png`. Artifacts show Space selected and dialog `The Moon` when the card path was used.

## Gotchas

- `#solarSystem` uses the `hidden` attribute; assert that, not only CSS visibility.
- Body cards still use `#cardTitle`; sizes-strip items use `.ss-size-item[data-id]` as an alternate entry — strip chips are enough for proof.
- Fluid handoff from globe zoom can enter Space without a tab click; doctor the selected tab before blaming the harness.
- ISS is a special strip/pin case that does not open a normal card — avoid `data-id="iss"` for card proofs.
