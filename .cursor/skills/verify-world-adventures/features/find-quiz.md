# Find quiz

Find quiz asks the kid to find a prompted place in the current adventure pool, shows a Find prompt with cue and emoji or photo, and tracks stickers when places are found.

## Sub-features

- `find-start` opens the Find prompt from the Find control or Luna.
- `find-prompt` shows `Find this!` plus a target emoji or photo.
- `find-correct-tap` chooses the matching strip chip for the prompted place and wins the round.
- `find-exit` stops finding with the Stop finding control.
- `find-again` offers Find another after a successful find.

## How to get to it (user POV)

- Choose the `Find this place` button in the top controls.
- Choose Luna (`Luna, start a find`) when idle.
- While Find is active, tap the strip chip (or pin) that matches the prompt.
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
- **Resolve target id.** Map the prompt to a strip chip. Run `control-world-adventures browser eval --js '(()=>{const alt=document.getElementById("findPhoto")?.alt||"";const emoji=document.getElementById("findEmoji")?.textContent||"";const thumbs=[...document.querySelectorAll("#strip .thumb")];const m=thumbs.find(t=>(alt&&t.title===alt)||(emoji&&(t.textContent||"").includes(emoji)));return m?m.getAttribute("data-id"):null;})()'`. Expect a non-null landmark id such as `eiffel`.
- **Correct tap.** Click that chip. Run `control-world-adventures browser click --selector '#strip .thumb[data-id="<id>"]'` with the id from the previous step. Then wait on `#card:not([hidden])` and `#findAgain:not([hidden])`. Cue text becomes `You found it!` (or `You found them all!`) and Again is enabled.
- **Proof win.** Run `control-world-adventures browser snapshot --aria --path find-quiz/win.aria.txt` and `control-world-adventures browser screenshot --path find-quiz/win.png`. The snapshot shows the found cue and an enabled Find another control.
- **Stop Find (optional exit path).** If still in Find after closing the card, choose Stop finding. Run `control-world-adventures browser click --role button --name "Stop finding"`. Then wait until `#findPrompt` is hidden again.

## Gotchas

- A pool smaller than two places refuses to start; stay on the default Landmarks list.
- Prefer strip chips over globe pins for the correct-tap proof; pins are unstable under headless WebGL.
- Photo `alt` matches the place `title` on the chip when a photo cue is shown; otherwise match emoji text inside the chip.
- Luna also starts Find — either entry is valid; record which one you used.
- Leaving the tab or opening stickers mid-quiz changes chrome; stop Find before switching tabs for unrelated proofs.
