# Adventure tabs

Adventure tabs let a kid switch the active place pool and chrome among Landmarks, Natural wonders, Continents, Countries, and Space.

## Sub-features

- `tab-landmarks` selects Landmarks and shows landmark strip chips.
- `tab-wonders` selects Natural wonders.
- `tab-continents` selects Continents.
- `tab-countries` selects Countries.
- `tab-space` selects Space and reveals the solar-system stage.

## How to get to it (user POV)

- Choose a tab in the `Pick an adventure` tablist: `Landmarks`, `Natural wonders`, `Continents`, `Countries`, or `Space`.
- Pinch/zoom the globe far enough to hand off into Space (fluid path); prefer the Space tab for scripted proof.

## Driving it with control-world-adventures

Preconditions:

- World Adventures is healthy at the launch URL.
- `control-world-adventures browser ready` has succeeded.
- Start from Landmarks selected unless a step says otherwise.

- **Wonders.** Choose Natural wonders. Run `control-world-adventures browser click --role tab --name "Natural wonders"`. Run `control-world-adventures browser eval --js 'document.getElementById("tabWonders").getAttribute("aria-selected")'`. Value is `true`. The explore label becomes `🌋 Natural wonders`.
- **Continents.** Run `control-world-adventures browser click --role tab --name "Continents"`. `tabContinents` `aria-selected` is `true` and the strip contains a continent chip such as `data-id="africa"`.
- **Countries.** Run `control-world-adventures browser click --role tab --name "Countries"`. `tabCountries` is selected and the strip has country chips.
- **Space.** Run `control-world-adventures browser click --role tab --name "Space"`. `tabSpace` is selected and `#solarSystem` is not `hidden`.
- **Return to Landmarks.** Run `control-world-adventures browser click --role tab --name "Landmarks"`. `tabLandmarks` is selected and `#strip .thumb[data-id="eiffel"]` exists.
- **Proof.** On Space, run `control-world-adventures browser snapshot --aria --path adventure-tabs/space.aria.txt` and `control-world-adventures browser screenshot --path adventure-tabs/space.png`. The snapshot shows tab `Space` selected and a solar-system region.

## Gotchas

- Accessible names are `Natural wonders` (not `Wonders`) and match `aria-label` on each tab.
- Switching tabs closes an open place card and stops Find — re-establish those states after a tab change.
- Globe pinch handoff also enters Space; do not treat an accidental zoom as a failed tab click.
- After leaving Space, wait for earth strip chips before asserting landmark selectors.
