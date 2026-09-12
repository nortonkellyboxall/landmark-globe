# Moon phases

Moon phases opens a full-card Phases toy on The Moon with named phase steps and a face/diagram the kid can turn through.

## Sub-features

- `phases-button` reveals the Phases action only on The Moon card.
- `phases-open` opens the phases panel and presses the control to `Hide phases`.
- `phases-step` moves among the eight named phases via the toy controls.
- `phases-close` hides the panel again.

## How to get to it (user POV)

- Choose the `Space` tab, open `The Moon` from the strip, then choose `Phases` on the card actions.
- Choose `Hide phases` (same control) to close the toy while keeping the card open.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- `control-world-adventures browser ready` has succeeded.
- Space tab is active and The Moon card is open (`#cardTitle` is `The Moon`).

- **Reveal Phases.** With The Moon card open, run `control-world-adventures browser eval --js 'document.getElementById("moonPhaseBtn").hidden'`. Value is `false`.
- **Open toy.** Choose Phases. Run `control-world-adventures browser click --selector '#moonPhaseBtn'`. Then run `control-world-adventures browser wait --selector '#moonPhasePanel:not([hidden])'`. The panel is visible and the button label includes `Hide phases`.
- **Confirm phase chrome.** Run `control-world-adventures browser eval --js 'document.getElementById("moonPhaseHost").childElementCount > 0'`. Value is `true`.
- **Close toy.** Choose Hide phases. Run `control-world-adventures browser click --selector '#moonPhaseBtn'`. `#moonPhasePanel` is hidden again and the button returns to `Phases`.
- **Proof.** Open Phases, then run `control-world-adventures browser snapshot --aria --path moon-phases/open.aria.txt` and `control-world-adventures browser screenshot --path moon-phases/open.png`. The screenshot shows the Moon card with the phases panel open; the snapshot still identifies dialog `The Moon`.

## Gotchas

- The Phases button stays hidden on every place except `data-id="moon"` — opening Eiffel first will not show it.
- You must be on Space (or otherwise have The Moon in the active pool) to open the Moon card from the strip.
- Closing the place card also tears down the phases toy; reopen The Moon before another phases proof.
- Phase speech clips need network/audio; visual panel open is sufficient proof without asserting spoken audio.
