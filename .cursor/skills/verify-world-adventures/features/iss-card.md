# ISS card and mesh

The ISS is an Earth traveler Place: the kid taps the Space station pin to open **The ISS** card, and a pale craft mesh rides with the station on the shared Earth view.

## Sub-features

- `iss-pin` shows a pin with aria-label `Space station` (`.pin[data-id="iss"]` / `.pin-iss`).
- `iss-card-open` opens the place dialog titled `The ISS` from that pin.
- `iss-not-in-strip` keeps ISS out of adventure strip chips and Space sizes rows.
- `iss-mesh-earth` keeps the craft visible only while Earth-local view is showing (hidden in solar overview).

## How to get to it (user POV)

- On an Earth adventure tab, tap the orbiting Space station pin on the Interactive Earth.
- There is no ISS strip chip and Surprise / Find never target it.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- Landmarks tab is active and Space mode is off.
- Camera is near Earth (after ready, or `browser pov --altitude 2.45`).
- `control-world-adventures browser ready` has succeeded.
- Place card is closed.

- **Confirm pin exists.** Run `control-world-adventures browser wait --selector '.pin[data-id="iss"]' --state attached`. Then run `control-world-adventures browser eval --js 'document.querySelector(".pin[data-id=\\"iss\\"]")?.getAttribute("aria-label")'`. Expect `Space station`.
- **Open ISS card.** Prefer a real click: `control-world-adventures browser click --selector '.pin[data-id="iss"]' --force`. If WebGL projection still blocks interaction, run `control-world-adventures browser eval --js 'document.querySelector(".pin[data-id=\\"iss\\"]")?.click()'`. Then `control-world-adventures browser wait --selector '#card:not([hidden])'` and `control-world-adventures browser text --selector '#cardTitle'`. The title is `The ISS`.
- **Confirm not on strip.** Run `control-world-adventures browser eval --js '!!document.querySelector("#strip .thumb[data-id=\\"iss\\"]")'`. Expect `false`.
- **Proof card.** Run `control-world-adventures browser snapshot --aria --path iss-card/card.aria.txt` and `control-world-adventures browser screenshot --path iss-card/card.png`. Artifacts show dialog `The ISS`.
- **Mesh vs Space (overview check).** Close the card if needed, then enter Space with `control-world-adventures browser click --role tab --name "Space"`. Run `control-world-adventures browser eval --js '({spaceMode:document.body.classList.contains("space-mode"), pinDisplay:getComputedStyle(document.querySelector(".pin-layer")||document.createElement("div")).display, sizesIss:document.querySelectorAll("#ssSizesRow [data-id=\\"iss\\"]").length})'`. Expect `spaceMode` `true`, pin layer `none` (or no visible ISS pin), and `sizesIss` `0`. Screenshot `iss-card/space-hidden.png`.
- **Return Earth.** Run `control-world-adventures browser click --role tab --name "Landmarks"` and wait for `#strip .thumb[data-id="eiffel"]`.

## Gotchas

- ISS is pin-only. Never require `#strip .thumb[data-id="iss"]`.
- Under headless WebGL the pin may be opacity `0` / `pointer-events: none` when off-screen; `--force` or a programmatic `.click()` on the pin element still exercises the real pin handler.
- The craft mesh has no DOM node — prove card + Earth-vs-Space pin/sizes chrome; treat WebGL mesh motion as covered by unit checks plus the Space-hidden screenshot.
- Find must never resolve target id `iss` ([find-quiz](./find-quiz.md)).
