/** Moon phases toy — pure math + DOM factory. */

export const PHASE_ORDER = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

export const PHASES = [
  {
    id: "new",
    name: "New Moon",
    blurb: "The sunny side faces away from Earth, so the Moon looks dark.",
  },
  {
    id: "waxing-crescent",
    name: "Waxing Crescent",
    blurb: "A thin bright smile is growing. Waxing means getting bigger.",
  },
  {
    id: "first-quarter",
    name: "First Quarter",
    blurb: "Half the Moon is bright — like a cookie cut down the middle.",
  },
  {
    id: "waxing-gibbous",
    name: "Waxing Gibbous",
    blurb: "More than half is lit and still growing toward full.",
  },
  {
    id: "full",
    name: "Full Moon",
    blurb: "The whole sunny side faces Earth.",
  },
  {
    id: "waning-gibbous",
    name: "Waning Gibbous",
    blurb: "Still bright, but a little less each night. Waning means getting smaller.",
  },
  {
    id: "last-quarter",
    name: "Last Quarter",
    blurb: "Half bright again — the other half from First Quarter.",
  },
  {
    id: "waning-crescent",
    name: "Waning Crescent",
    blurb: "A thin bright smile is shrinking toward New Moon.",
  },
];

/** Half-open bands; `new` wraps across 0. Spec: docs/superpowers/specs/2026-08-17-moon-phases-design.md */
const BANDS = [
  { id: "new", start: 0.9375, end: 1 },
  { id: "new", start: 0, end: 0.0625 },
  { id: "waxing-crescent", start: 0.0625, end: 0.1875 },
  { id: "first-quarter", start: 0.1875, end: 0.3125 },
  { id: "waxing-gibbous", start: 0.3125, end: 0.4375 },
  { id: "full", start: 0.4375, end: 0.5625 },
  { id: "waning-gibbous", start: 0.5625, end: 0.6875 },
  { id: "last-quarter", start: 0.6875, end: 0.8125 },
  { id: "waning-crescent", start: 0.8125, end: 0.9375 },
];

function wrapTurn(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return ((n % 1) + 1) % 1;
}

function phaseIdForTurn(t) {
  for (const b of BANDS) {
    if (t >= b.start && t < b.end) return b.id;
  }
  return "new";
}

/**
 * @param {number} t orbit turn
 * @returns {{ id: string, name: string, blurb: string, litFraction: number, moonAngle: number }}
 */
export function phaseFromTurn(t) {
  const u = wrapTurn(t);
  const id = phaseIdForTurn(u);
  const meta = PHASES.find((p) => p.id === id) || PHASES[0];
  return {
    id: meta.id,
    name: meta.name,
    blurb: meta.blurb,
    litFraction: 0.5 - 0.5 * Math.cos(2 * Math.PI * u),
    moonAngle: 2 * Math.PI * u,
  };
}

/**
 * @param {HTMLElement} container
 * @param {{ onPhaseChange?: (phase: ReturnType<typeof phaseFromTurn>) => void, onInteractEnd?: (phase: ReturnType<typeof phaseFromTurn>) => void }} [opts]
 */
export function createMoonPhaseToy(container, opts) {
  const onPhaseChange = opts && opts.onPhaseChange;
  const onInteractEnd = opts && opts.onInteractEnd;
  let t = 0.5;
  let lastId = null;
  let destroyed = false;

  const root = document.createElement("div");
  root.className = "moon-phase-toy";
  root.innerHTML = `
    <div class="moon-phase-face-wrap">
      <svg class="moon-phase-face" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <clipPath id="moonPhaseDisk">
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>
        <circle class="moon-phase-disk" cx="50" cy="50" r="46" />
        <g clip-path="url(#moonPhaseDisk)">
          <rect class="moon-phase-shadow" x="0" y="0" width="100" height="100" />
          <ellipse class="moon-phase-terminator" cx="50" cy="50" ry="46" rx="0" />
        </g>
        <circle class="moon-phase-rim" cx="50" cy="50" r="46" fill="none" />
      </svg>
      <p class="moon-phase-name" data-phase-name aria-live="polite"></p>
      <p class="moon-phase-blurb" data-phase-blurb></p>
    </div>
    <div class="moon-phase-orbit-wrap">
      <svg class="moon-phase-orbit" viewBox="0 0 200 200" role="img" aria-label="Earth Moon and Sun diagram">
        <circle class="moon-phase-sun" cx="178" cy="100" r="14" />
        <circle class="moon-phase-earth" cx="100" cy="100" r="18" />
        <circle class="moon-phase-path" cx="100" cy="100" r="58" fill="none" />
        <circle class="moon-phase-moon" cx="158" cy="100" r="8" />
      </svg>
      <label class="moon-phase-slider-label">
        <span class="sr-only">Move the Moon around Earth</span>
        <input type="range" class="moon-phase-slider" min="0" max="1000" value="500" />
      </label>
    </div>
  `;

  const clip = root.querySelector("#moonPhaseDisk");
  const clipId = `moonPhaseDisk-${Math.random().toString(36).slice(2, 8)}`;
  if (clip) {
    clip.id = clipId;
    const g = root.querySelector("[clip-path]");
    if (g) g.setAttribute("clip-path", `url(#${clipId})`);
  }

  const nameEl = root.querySelector("[data-phase-name]");
  const blurbEl = root.querySelector("[data-phase-blurb]");
  const shadow = root.querySelector(".moon-phase-shadow");
  const terminator = root.querySelector(".moon-phase-terminator");
  const moonDot = root.querySelector(".moon-phase-moon");
  const slider = root.querySelector(".moon-phase-slider");
  const orbitSvg = root.querySelector(".moon-phase-orbit");

  function paint() {
    const phase = phaseFromTurn(t);
    if (nameEl) nameEl.textContent = phase.name;
    if (blurbEl) blurbEl.textContent = phase.blurb;
    if (slider) slider.value = String(Math.round(t * 1000));

    const lit = phase.litFraction;
    const waxing = t < 0.5;
    if (shadow) {
      shadow.setAttribute("x", waxing ? "0" : "50");
      shadow.setAttribute("width", "50");
      shadow.style.opacity = lit <= 0.02 ? "1" : lit >= 0.98 ? "0" : "1";
    }
    if (terminator) {
      const rx = Math.abs(2 * lit - 1) * 46;
      terminator.setAttribute("rx", String(rx));
      terminator.setAttribute("cx", "50");
      terminator.style.fill = lit < 0.5 ? "#0b1220" : "#e8e0d0";
      if (lit <= 0.02 || lit >= 0.98) terminator.style.opacity = "0";
      else terminator.style.opacity = "1";
    }

    const r = 58;
    const x = 100 + Math.cos(phase.moonAngle) * r;
    const y = 100 + Math.sin(phase.moonAngle) * r;
    if (moonDot) {
      moonDot.setAttribute("cx", String(x));
      moonDot.setAttribute("cy", String(y));
    }

    if (phase.id !== lastId) {
      lastId = phase.id;
      if (typeof onPhaseChange === "function") onPhaseChange(phase);
    }
  }

  function setTurn(next) {
    if (destroyed) return;
    t = wrapTurn(next);
    paint();
  }

  function getTurn() {
    return t;
  }

  function turnFromPointer(clientX, clientY) {
    if (!orbitSvg) return t;
    const rect = orbitSvg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ang = Math.atan2(clientY - cy, clientX - cx);
    return wrapTurn(ang / (2 * Math.PI));
  }

  let dragging = false;
  function handleOrbitPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    orbitSvg?.setPointerCapture?.(e.pointerId);
    setTurn(turnFromPointer(e.clientX, e.clientY));
  }
  function handleOrbitPointerMove(e) {
    if (!dragging) return;
    setTurn(turnFromPointer(e.clientX, e.clientY));
  }
  function notifyInteractEnd() {
    if (typeof onInteractEnd !== "function") return;
    onInteractEnd(phaseFromTurn(t));
  }
  function handleOrbitPointerUp() {
    if (!dragging) return;
    dragging = false;
    notifyInteractEnd();
  }
  function handleSliderInput() {
    if (!slider) return;
    setTurn(Number(slider.value) / 1000);
  }
  function handleSliderChange() {
    notifyInteractEnd();
  }

  if (orbitSvg) {
    orbitSvg.addEventListener("pointerdown", handleOrbitPointerDown);
    orbitSvg.addEventListener("pointermove", handleOrbitPointerMove);
    orbitSvg.addEventListener("pointerup", handleOrbitPointerUp);
    orbitSvg.addEventListener("pointercancel", handleOrbitPointerUp);
  }
  if (slider) {
    slider.addEventListener("input", handleSliderInput);
    slider.addEventListener("change", handleSliderChange);
  }

  container.appendChild(root);
  paint();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (orbitSvg) {
      orbitSvg.removeEventListener("pointerdown", handleOrbitPointerDown);
      orbitSvg.removeEventListener("pointermove", handleOrbitPointerMove);
      orbitSvg.removeEventListener("pointerup", handleOrbitPointerUp);
      orbitSvg.removeEventListener("pointercancel", handleOrbitPointerUp);
    }
    if (slider) {
      slider.removeEventListener("input", handleSliderInput);
      slider.removeEventListener("change", handleSliderChange);
    }
    root.remove();
  }

  return { setTurn, getTurn, destroy };
}
