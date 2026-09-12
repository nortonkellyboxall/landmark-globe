# Find quiz

Find quiz asks the kid to find a prompted place in the current adventure pool, shows a Find prompt with cue and emoji or photo, and tracks stickers when places are found.

## Sub-features

- `find-start` opens the Find prompt from the Find control or Luna.
- `find-prompt` shows `Find this!` plus a target emoji or photo.
- `find-exit` stops finding with the Stop finding control.
- `find-again` offers Find another after a successful find (full correct-tap loops are optional for smoke proof).

## How to get to it (user POV)

- Choose the `Find this place` button in the top controls.
- Choose Luna (`Luna, start a find`) when idle.
- While Find is active, choose `Stop finding` on the prompt to exit.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- Landmarks tab is active with a full landmark pool (not a continent filter).
- `control-world-adventures browser ready` has succeeded.
- Find is not already active (`#findPrompt` is hidden).

- **Start Find.** Choose Find this place. Run `control-world-adventures browser click --role button --name "Find this place"`. Then run `control-world-adventures browser wait --selector '#findPrompt:not([hidden])'`. The prompt is visible.
- **Confirm cue.** Run `control-world-adventures browser text --selector '#findCue'`. The text is `Find this!`.
- **Confirm target chrome.** Run `control-world-adventures browser eval --js '({emoji:document.getElementById("findEmoji")?.textContent, photoHidden:document.getElementById("findPhoto")?.hidden})'`. Either a non-empty emoji or a visible photo is present.
- **Stop Find.** Choose Stop finding. Run `control-world-adventures browser click --role button --name "Stop finding"`. Then wait until `#findPrompt` is hidden again.
- **Proof.** Start Find once more, then run `control-world-adventures browser snapshot --aria --path find-quiz/prompt.aria.txt` and `control-world-adventures browser screenshot --path find-quiz/prompt.png`. The snapshot includes a Find prompt region and cue `Find this!`.

## Gotchas

- A pool smaller than two places refuses to start; stay on the default Landmarks list.
- Correct pin/strip taps advance the quiz and open the card; a smoke proof does not require winning a round.
- Luna also starts Find — either entry is valid; record which one you used.
- Leaving the tab or opening stickers mid-quiz changes chrome; stop Find before switching tabs for unrelated proofs.
