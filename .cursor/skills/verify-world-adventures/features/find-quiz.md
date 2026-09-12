# Find quiz

Find quiz asks the kid to find a prompted place in the current adventure pool, shows a Find prompt with cue and emoji or photo, shows a found tally for the current pool, and tracks stickers when places are found.

## Sub-features

- `find-start` opens the Find prompt from the Find control or Luna.
- `find-prompt` shows `Find this!` plus a target emoji or photo.
- `find-tally` shows `found / total` for the current adventure pool in `#findTally`.
- `find-correct-tap` chooses the matching strip chip for the prompted place and wins the round.
- `find-again` starts another round with Find another after a successful find.
- `find-exit` stops finding with the Stop finding control.
- `find-no-iss` never prompts the ISS (Earth pools omit it; Space Find targets bodies only).

## How to get to it (user POV)

- Choose the `Find this place` button in the top controls.
- Choose Luna (`Luna, start a find`) when idle.
- While Find is active, tap the strip chip (or pin) that matches the prompt.
- After a win, choose `Find another` for a new target, or `Stop finding` to exit.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- Landmarks tab is active with a full landmark pool (not a continent filter).
- `control-world-adventures browser ready` has succeeded.
- Find is not already active (`#findPrompt` is hidden).

- **Start Find.** Choose Find this place. Run `control-world-adventures browser click --role button --name "Find this place"`. Then run `control-world-adventures browser wait --selector '#findPrompt:not([hidden])'`. The prompt is visible.
- **Confirm cue.** Run `control-world-adventures browser text --selector '#findCue'`. The text is `Find this!`.
- **Confirm tally.** Run `control-world-adventures browser text --selector '#findTally'`. The text matches `N / M` with `M` at least `2`.
- **Confirm target chrome.** Run `control-world-adventures browser eval --js '({emoji:document.getElementById("findEmoji")?.textContent, photoHidden:document.getElementById("findPhoto")?.hidden})'`. Either a non-empty emoji or a visible photo is present.
- **Assert not ISS.** Run `control-world-adventures browser eval --js '(()=>{const alt=document.getElementById("findPhoto")?.alt||"";const emoji=document.getElementById("findEmoji")?.textContent||"";const thumbs=[...document.querySelectorAll("#strip .thumb")];const m=thumbs.find(t=>(alt&&t.title===alt)||(emoji&&(t.textContent||"").includes(emoji)));const id=m?m.getAttribute("data-id"):null;return {id, stripHasIss:!!document.querySelector("#strip .thumb[data-id=\\"iss\\"]")};})()'`. Expect a non-null landmark id that is not `iss`, and `stripHasIss` `false`.
- **Correct tap.** Click that chip. Run `control-world-adventures browser click --selector '#strip .thumb[data-id="<id>"]'` with the id from the previous step. Then wait on `#card:not([hidden])` and `#findAgain:not([hidden])`. Cue text becomes `You found it!` (or `You found them all!`) and Again is enabled.
- **Proof win.** With the found cue visible, run `control-world-adventures browser snapshot --aria --path find-quiz/win.aria.txt` and `control-world-adventures browser screenshot --path find-quiz/win.png`. The snapshot shows the found cue and an enabled Find another control.
- **Find another.** Prefer closing the place card so Find resumes the next round automatically. Run `control-world-adventures browser click --selector '#cardClose'`, wait on `#card[hidden]`, then wait until `#findCue` is `Find this!` again with `#findPrompt` still open. (The `#overlay` blocks Find another while the card is open; `Find another` is an alternate control once the overlay is gone — `browser click --selector '#findAgain' --force` also works.)
- **Stop Find (optional exit path).** If still in Find after closing the card, choose Stop finding. Run `control-world-adventures browser click --role button --name "Stop finding"`. Then wait until `#findPrompt` is hidden again.
- **Luna entry (optional).** From idle Landmarks with Find closed, run `control-world-adventures browser click --role button --name "Luna, start a find"` and wait on `#findPrompt:not([hidden])`.

## Gotchas

- A pool smaller than two places refuses to start; stay on the default Landmarks list.
- Prefer strip chips over globe pins for the correct-tap proof; pins are unstable under headless WebGL.
- Photo `alt` matches the place name (= strip `title`) when a photo cue is shown; otherwise match emoji text inside the chip.
- Luna also starts Find — either entry is valid; record which one you used.
- Leaving the tab or opening stickers mid-quiz changes chrome; stop Find before switching tabs for unrelated proofs.
- On Space, Find highlights the target on the sizes strip (`.find-target`); Earth recipes do not need that chrome.
