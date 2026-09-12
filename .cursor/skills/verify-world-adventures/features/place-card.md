# Open a place card

Place card lets a kid open a landmark (or other place) dialog with title, place line, story, and actions after choosing it from the shortcut strip or Surprise.

## Sub-features

- `card-strip-open` opens the card from a strip chip.
- `card-title` shows the place name in the dialog heading.
- `card-close` dismisses the dialog with the Close control.
- `card-surprise` opens some place card via Surprise me.

## How to get to it (user POV)

- Tap a place chip in the Place shortcuts strip (emoji + name).
- Tap a pin on the Interactive Earth globe (harder to automate; prefer strip for proof).
- Choose the `Surprise me` button in the top controls.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- Adventure tab `Landmarks` is selected (`aria-selected=true`).
- `control-world-adventures browser ready` has succeeded.
- `control-world-adventures doctor` reports `healthy: true`.

- **Open from strip.** Choose the Eiffel Tower chip. Run `control-world-adventures browser click --selector '#strip .thumb[data-id="eiffel"]'`. Then run `control-world-adventures browser wait --selector '#card:not([hidden])'`. The dialog is visible.
- **Confirm title.** Read the heading. Run `control-world-adventures browser text --selector '#cardTitle'`. The text is `Eiffel Tower`.
- **Confirm place line.** Run `control-world-adventures browser text --selector '#cardPlace'`. The text includes `Paris`.
- **Close card.** Choose Close. Run `control-world-adventures browser click --selector '#cardClose'`. Then run `control-world-adventures browser wait --selector '#card[hidden]' --state attached`. The dialog is hidden again.
- **Surprise entry.** Choose Surprise me. Run `control-world-adventures browser click --role button --name "Surprise me"` and `control-world-adventures browser wait --selector '#card:not([hidden])'`. `#cardTitle` is a non-empty landmark name from the current strip pool.
- **Proof.** With a known card open (re-open Eiffel if needed), run `control-world-adventures browser snapshot --aria --path place-card/card.aria.txt` and `control-world-adventures browser screenshot --path place-card/card.png`. The snapshot lists a dialog named `Eiffel Tower` and the screenshot shows the brand plus the open card.

## Gotchas

- Strip chips are `<button class="thumb" title="…">` with visible name text; still prefer `data-id` selectors over `getByRole` by place name for stable scripts.
- Reduced motion still opens the card after a short schedule delay; wait on `#card:not([hidden])`, not a fixed sleep alone.
- Globe pin taps are valid user paths but are unstable under headless WebGL — do not require pin hits for a passing proof when the strip path works.
- Surprise picks a random place; assert a non-empty title from the Landmarks pool, or re-open `eiffel` for deterministic screenshot proof.
