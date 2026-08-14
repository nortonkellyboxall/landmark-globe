import { shouldEnterSpace } from "./orbit-look.js";

export function planetDisplayPx(km, jupKm, maxPx) {
  return Math.max(8, Math.round((km / jupKm) * maxPx));
}

export function createSpaceMode(opts) {
  let spaceTransitioning = false;
  let spacePinchArmed = false;
  let Solar3D = null;
  // loadSolar3D / ensureSolar3D / buildSizesView / setSizesOpen
  // enter / leave copied in Task 6 if Step 3 stays flags-only
  function armPinch() { spacePinchArmed = true; }
  function shouldHandoff(alt) {
    return shouldEnterSpace(alt, spacePinchArmed)
      && opts.getTab() !== "space"
      && !spaceTransitioning;
  }
  return {
    isTransitioning: () => spaceTransitioning,
    isPinchArmed: () => spacePinchArmed,
    armPinch,
    shouldHandoff,
    planetDisplayPx,
  };
}
