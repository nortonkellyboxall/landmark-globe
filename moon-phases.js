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

/** Phase midpoints for step buttons (new → … → waning-crescent). */
const PHASE_MIDS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

/**
 * Earth-sky silhouette (northern-hemisphere convention):
 * waxing → right lit, waning → left lit. Used by the face painter + checks.
 * @param {number} t
 * @returns {{ litFraction: number, litSide: "none" | "right" | "left" | "full", shadowX: number, shadowWidth: number, terminatorRx: number, terminatorFill: "dark" | "light" | "hidden" }}
 */
export function earthViewFace(t) {
  const u = wrapTurn(t);
  const litFraction = 0.5 - 0.5 * Math.cos(2 * Math.PI * u);
  if (litFraction <= 0.02) {
    return {
      litFraction,
      litSide: "none",
      shadowX: 0,
      shadowWidth: 100,
      terminatorRx: 0,
      terminatorFill: "hidden",
    };
  }
  if (litFraction >= 0.98) {
    return {
      litFraction,
      litSide: "full",
      shadowX: 0,
      shadowWidth: 0,
      terminatorRx: 0,
      terminatorFill: "hidden",
    };
  }
  const waxing = u < 0.5;
  return {
    litFraction,
    litSide: waxing ? "right" : "left",
    shadowX: waxing ? 0 : 50,
    shadowWidth: 50,
    terminatorRx: Math.abs(2 * litFraction - 1) * 46,
    terminatorFill: litFraction < 0.5 ? "dark" : "light",
  };
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
  const moonFaceSrc = new URL(
    "./textures/planets/moon-face.jpg",
    import.meta.url,
  ).href;
  root.innerHTML = `
    <div class="moon-phase-face-wrap">
      <svg class="moon-phase-face" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <clipPath id="moonPhaseDisk">
            <circle cx="50" cy="50" r="46" />
          </clipPath>
          <mask id="moonPhaseLitMask" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="46" fill="#fff" />
            <g filter="url(#moonPhaseSoft)">
              <rect class="moon-phase-shadow" x="0" y="0" width="0" height="100" fill="#000" />
              <ellipse class="moon-phase-terminator" cx="50" cy="50" ry="46" rx="0" fill="#000" />
            </g>
          </mask>
          <filter id="moonPhaseSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
          <radialGradient id="moonPhaseSphere" cx="38%" cy="34%" r="62%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
            <stop offset="45%" stop-color="#ffffff" stop-opacity="0" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.42" />
          </radialGradient>
        </defs>
        <circle class="moon-phase-night" cx="50" cy="50" r="46" />
        <image
          class="moon-phase-tex"
          href="${moonFaceSrc}"
          x="4"
          y="4"
          width="92"
          height="92"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#moonPhaseDisk)"
          mask="url(#moonPhaseLitMask)"
        ></image>
        <circle
          class="moon-phase-sphere"
          cx="50"
          cy="50"
          r="46"
          fill="url(#moonPhaseSphere)"
          clip-path="url(#moonPhaseDisk)"
        />
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
      <div class="moon-phase-scrub">
        <button type="button" class="moon-phase-step" data-phase-step="-1" aria-label="Previous phase">‹</button>
        <label class="moon-phase-slider-label">
          <span class="sr-only">Move the Moon around Earth</span>
          <input type="range" class="moon-phase-slider" min="0" max="1000" value="500" />
        </label>
        <button type="button" class="moon-phase-step" data-phase-step="1" aria-label="Next phase">›</button>
      </div>
    </div>
  `;

  const clip = root.querySelector("#moonPhaseDisk");
  const mask = root.querySelector("#moonPhaseLitMask");
  const soft = root.querySelector("#moonPhaseSoft");
  const sphere = root.querySelector("#moonPhaseSphere");
  const uid = Math.random().toString(36).slice(2, 8);
  const clipId = `moonPhaseDisk-${uid}`;
  const maskId = `moonPhaseLitMask-${uid}`;
  const softId = `moonPhaseSoft-${uid}`;
  const sphereId = `moonPhaseSphere-${uid}`;
  if (clip) clip.id = clipId;
  if (mask) mask.id = maskId;
  if (soft) soft.id = softId;
  if (sphere) sphere.id = sphereId;
  root.querySelectorAll("[clip-path]").forEach((el) => {
    el.setAttribute("clip-path", `url(#${clipId})`);
  });
  const tex = root.querySelector(".moon-phase-tex");
  if (tex) tex.setAttribute("mask", `url(#${maskId})`);
  const softGroup = root.querySelector(`#${maskId} g`);
  if (softGroup) softGroup.setAttribute("filter", `url(#${softId})`);
  const sphereFill = root.querySelector(".moon-phase-sphere");
  if (sphereFill) {
    sphereFill.setAttribute("fill", `url(#${sphereId})`);
    sphereFill.setAttribute("mask", `url(#${maskId})`);
  }

  const nameEl = root.querySelector("[data-phase-name]");
  const blurbEl = root.querySelector("[data-phase-blurb]");
  const shadow = root.querySelector(".moon-phase-shadow");
  const terminator = root.querySelector(".moon-phase-terminator");
  const moonDot = root.querySelector(".moon-phase-moon");
  const slider = root.querySelector(".moon-phase-slider");
  const orbitSvg = root.querySelector(".moon-phase-orbit");
  const stepBtns = [...root.querySelectorAll("[data-phase-step]")];

  function paint() {
    const phase = phaseFromTurn(t);
    if (nameEl) nameEl.textContent = phase.name;
    if (blurbEl) blurbEl.textContent = phase.blurb;
    if (slider) slider.value = String(Math.round(t * 1000));

    // Earth-facing disk: photo masked so lit side matches N. hemisphere sky
    const face = earthViewFace(t);
    if (shadow) {
      shadow.setAttribute("x", String(face.shadowX));
      shadow.setAttribute("width", String(face.shadowWidth));
      shadow.setAttribute("fill", "#000");
    }
    if (terminator) {
      terminator.setAttribute("rx", String(face.terminatorRx));
      terminator.setAttribute("cx", "50");
      if (face.terminatorFill === "hidden") {
        terminator.setAttribute("rx", "0");
        terminator.setAttribute("fill", "#000");
        terminator.style.opacity = "0";
      } else {
        terminator.style.opacity = "1";
        // Mask: black hides texture (crescent), white restores it (gibbous)
        terminator.setAttribute(
          "fill",
          face.terminatorFill === "dark" ? "#000" : "#fff",
        );
      }
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
  function handlePhaseStep(e) {
    const dir = Number(e.currentTarget.getAttribute("data-phase-step"));
    if (!Number.isFinite(dir) || dir === 0) return;
    const id = phaseFromTurn(t).id;
    let i = PHASE_ORDER.indexOf(id);
    if (i < 0) i = 0;
    i = (i + dir + PHASE_ORDER.length) % PHASE_ORDER.length;
    setTurn(PHASE_MIDS[i]);
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
  for (const btn of stepBtns) {
    btn.addEventListener("click", handlePhaseStep);
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
    for (const btn of stepBtns) {
      btn.removeEventListener("click", handlePhaseStep);
    }
    root.remove();
  }

  return { setTurn, getTurn, destroy };
}
