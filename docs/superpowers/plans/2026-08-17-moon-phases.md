# Moon Phases Toy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a kid opens The Moon in Space, replace the photo gallery with an interactive Earth–Moon–Sun phase toy (face + diagram) and have Luna speak each phase name as it changes.

**Architecture:** Pure phase math and a DOM toy live in `moon-phases.js`. CardMedia mounts the toy when `place.id === "moon"`. Speech uses a new `speakPhase` export and eight pre-baked MP3 clips. No extra WebGL.

**Tech Stack:** Vanilla ES modules, SVG + CSS, existing `speak.js` / `bake-speech.mjs`, Node `assert` checks.

**Spec:** `docs/superpowers/specs/2026-08-17-moon-phases-design.md`

## Global Constraints

- No bundler / no new npm deps
- Do not rebuild globe.gl / dual live Three
- Do not merge `toy.css` into `app.css`
- Do not recreate `chrome.js`
- ADR 0002: quiz rules stay out of Globe and CardMedia
- Content packs stay `window.*` / SpaceCatalog as today
- Node assert checks only — fake els, never jsdom
- After every code commit: `graphify update .` with Shell `required_permissions: ["all"]`
- Do not commit unrelated dirty files (`toy.css` WIP, `output/`, `.graphifyignore`, old plan leftovers) unless the task’s in-scope list includes them

## File map

| File | Responsibility |
|------|----------------|
| `CONTEXT.md` | Glossary term for Moon phases toy |
| `moon-phases.js` | `PHASES`, `phaseFromTurn`, `createMoonPhaseToy` |
| `tests/moon-phases.check.js` | Pure math asserts |
| `speak.js` | `speakPhase(phaseId)` |
| `scripts/bake-speech.mjs` | Bake eight `phase-<id>.name.mp3` clips |
| `vendor/tts/clips/phase-*.name.mp3` | Committed Luna clips |
| `card-media.js` | Mount/destroy toy for moon; wire speech |
| `toy.css` | Phase toy chrome |
| `index.html` | Optional: hide photo chrome when hero has phase toy (prefer CSS via class on card) |

Do **not** create: a second WebGL moon, calendar ephemeris, auto-orbit play button.

---

### Task 1: Glossary

**Files:**
- Modify: `CONTEXT.md`

**Interfaces:**
- Produces: domain term **Moon phases toy** for later tasks

- [x] **Step 1: Add glossary entry**

After the Ambient kind bullet in `CONTEXT.md`, add:

```markdown
- **Moon phases toy** — Interactive teacher on The Moon Place card in Space: shared orbit turn `t`, big moon face + Earth–Moon–Sun diagram, eight phase names. Math and DOM in `moon-phases.js`. CardMedia mounts it when `id === "moon"`; Luna speaks via `speakPhase`. Not tied to real calendar or Earth sun-drag.
```

Also extend the Speak bullet to mention `speakPhase`:

```markdown
- **Speak** — Pre-baked Luna MP3 clips in `vendor/tts/clips/` (`speakCard` / `speakName` / `speakPhase`). MP3 for Safari/phone support. Rebake with `node scripts/bake-speech.mjs`.
```

- [x] **Step 2: Commit**

```bash
git add CONTEXT.md
git commit -m "$(cat <<'EOF'
docs: name Moon phases toy in glossary

EOF
)"
graphify update .
```

---

### Task 2: Pure phase math (`phaseFromTurn`)

**Files:**
- Create: `moon-phases.js` (math + constants only in this task; toy factory comes in Task 4)
- Create: `tests/moon-phases.check.js`

**Interfaces:**
- Produces:
  - `export const PHASES` — array of `{ id, name, blurb }` in cycle order (new → … → waning-crescent)
  - `export function phaseFromTurn(t: number) => { id, name, blurb, litFraction, moonAngle }`
  - `t` wrapped to `[0, 1)`; `litFraction = 0.5 - 0.5 * Math.cos(2 * Math.PI * t)`; `moonAngle = 2 * Math.PI * t`

- [x] **Step 1: Write the failing check**

Create `tests/moon-phases.check.js`:

```js
import assert from "node:assert/strict";
import { PHASES, phaseFromTurn } from "../moon-phases.js";

assert.equal(phaseFromTurn(0).id, "new");
assert.equal(phaseFromTurn(1).id, "new");
assert.equal(phaseFromTurn(-0.01).id, "new");
assert.equal(phaseFromTurn(0.5).id, "full");
assert.equal(phaseFromTurn(0.25).id, "first-quarter");
assert.equal(phaseFromTurn(0.75).id, "last-quarter");

assert.ok(Math.abs(phaseFromTurn(0).litFraction) < 1e-9);
assert.ok(Math.abs(phaseFromTurn(0.5).litFraction - 1) < 1e-9);
assert.ok(Math.abs(phaseFromTurn(0.25).litFraction - 0.5) < 1e-9);

assert.ok(Math.abs(phaseFromTurn(0.5).moonAngle - Math.PI) < 1e-9);

assert.equal(PHASES.length, 8);
const ids = PHASES.map((p) => p.id);
assert.equal(new Set(ids).size, 8);
for (const p of PHASES) {
  assert.ok(p.name && p.blurb);
}

assert.equal(phaseFromTurn(0.0624).id, "new");
assert.equal(phaseFromTurn(0.0625).id, "waxing-crescent");
assert.equal(phaseFromTurn(0.4375).id, "full");
assert.equal(phaseFromTurn(0.9375).id, "new");

console.log("moon-phases.check.js OK");
```

- [x] **Step 2: Run check — expect RED**

Run: `node tests/moon-phases.check.js`  
Expected: fail (module missing or exports missing).

- [x] **Step 3: Implement math in `moon-phases.js`**

```js
/** Moon phases toy — pure math + DOM factory (factory added in later task). */

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
```

- [x] **Step 4: Run check — expect GREEN**

Run: `node tests/moon-phases.check.js`  
Expected: `moon-phases.check.js OK`, exit 0.

- [x] **Step 5: Commit**

```bash
git add moon-phases.js tests/moon-phases.check.js
git commit -m "$(cat <<'EOF'
feat(moon): add phaseFromTurn and phase table

EOF
)"
graphify update .
```

---

### Task 3: `speakPhase` + bake eight name clips

**Files:**
- Modify: `speak.js`
- Modify: `scripts/bake-speech.mjs`
- Create: `vendor/tts/clips/phase-<id>.name.mp3` (eight files)
- Create: `tests/speak-phase.check.js` (URL composition only — no Audio in Node)

**Interfaces:**
- Consumes: existing `clipUrl` / `playUrl` pattern in `speak.js`
- Produces: `export function speakPhase(phaseId: string): void` — plays `phase-${phaseId}.name.mp3`

- [x] **Step 1: Write failing check for clip path**

Create `tests/speak-phase.check.js` that imports a tiny pure helper. Prefer exporting `phaseClipId(phaseId)` from `speak.js` **or** keep logic inside `speakPhase` and instead assert file existence from the repo:

```js
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PHASES } from "../moon-phases.js";
import { speakPhase } from "../speak.js";

assert.equal(typeof speakPhase, "function");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of PHASES) {
  const mp3 = join(root, "vendor/tts/clips", `phase-${p.id}.name.mp3`);
  assert.equal(existsSync(mp3), true, `missing ${mp3}`);
}

console.log("speak-phase.check.js OK");
```

Note: this check fails until clips exist — implement `speakPhase` first, then bake, then re-run.

- [x] **Step 2: Add `speakPhase` to `speak.js`**

At the bottom of `speak.js` (after `speakName`):

```js
/**
 * Play a moon-phase name clip (pre-baked).
 * @param {string} phaseId e.g. "full"
 */
export function speakPhase(phaseId) {
  if (!phaseId) return;
  playUrl(clipUrl(`phase-${phaseId}`, "name"));
}
```

Do not change mute policy.

- [x] **Step 3: Extend `scripts/bake-speech.mjs`**

After the place bake loop (before `writeFileSync` for manifest), add:

```js
const PHASE_NAMES = [
  ["new", "New Moon."],
  ["waxing-crescent", "Waxing Crescent."],
  ["first-quarter", "First Quarter."],
  ["waxing-gibbous", "Waxing Gibbous."],
  ["full", "Full Moon."],
  ["waning-gibbous", "Waning Gibbous."],
  ["last-quarter", "Last Quarter."],
  ["waning-crescent", "Waning Crescent."],
];

for (const [id, text] of PHASE_NAMES) {
  await bakeOne(tts, `phase-${id}`, "name", text);
}
```

Keep existing place baking unchanged.

- [x] **Step 4: Bake clips**

Run: `node scripts/bake-speech.mjs`  
Expected: logs `bake phase-*.name` (or `skip` if already present); exit 0.

If the bake environment is missing (no `vendor/tts/model`, onnx, ffmpeg, or `scripts/node_modules/kitten-tts-js`), **STOP and report** — do not invent silent placeholder MP3s.

- [x] **Step 5: Run checks**

```bash
node tests/moon-phases.check.js
node tests/speak-phase.check.js
```

Expected: both OK.

- [x] **Step 6: Commit**

```bash
git add speak.js scripts/bake-speech.mjs tests/speak-phase.check.js vendor/tts/clips/phase-*.name.mp3
git commit -m "$(cat <<'EOF'
feat(speak): bake and play moon phase names

EOF
)"
graphify update .
```

---

### Task 4: `createMoonPhaseToy` DOM + CSS

**Files:**
- Modify: `moon-phases.js` (add factory)
- Modify: `toy.css`
- Test: extend `tests/moon-phases.check.js` only for exports (`typeof createMoonPhaseToy === "function"`). Do **not** jsdom-mount the toy.

**Interfaces:**
- Consumes: `phaseFromTurn`
- Produces: `export function createMoonPhaseToy(container, opts?) => { setTurn(t), getTurn(), destroy() }`
  - `opts.onPhaseChange?.(phase)` when `phase.id` changes
  - Default turn `0.5` (Full Moon)
  - Does **not** import Speak

- [x] **Step 1: Assert export exists (extend check)**

Append to `tests/moon-phases.check.js`:

```js
import { createMoonPhaseToy } from "../moon-phases.js";
assert.equal(typeof createMoonPhaseToy, "function");
```

Run: `node tests/moon-phases.check.js` — expect RED until factory is exported.

- [x] **Step 2: Implement `createMoonPhaseToy`**

Append to `moon-phases.js` (keep imports at top of file — none needed for DOM beyond browser globals):

```js
/**
 * @param {HTMLElement} container
 * @param {{ onPhaseChange?: (phase: ReturnType<typeof phaseFromTurn>) => void }} [opts]
 */
export function createMoonPhaseToy(container, opts) {
  const onPhaseChange = opts && opts.onPhaseChange;
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
      <p class="moon-phase-name" data-phase-name></p>
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

  // Unique clip id if multiple toys (safety)
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

    // Face: shadow covers dark side; terminator ellipse squeezes with litFraction
    const lit = phase.litFraction;
    const waxing = t < 0.5;
    if (shadow) {
      // Dark half: left when waxing (light on right), right when waning
      shadow.setAttribute("x", waxing ? "0" : "50");
      shadow.setAttribute("width", "50");
      shadow.style.opacity = lit <= 0.02 ? "1" : lit >= 0.98 ? "0" : "1";
    }
    if (terminator) {
      const rx = Math.abs(2 * lit - 1) * 46;
      terminator.setAttribute("rx", String(rx));
      terminator.setAttribute("cx", "50");
      // Match lit/dark: when waxing and lit<0.5, terminator is dark-on-left edge; keep fill dark
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
    const rect = orbitSvg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ang = Math.atan2(clientY - cy, clientX - cx);
    // Map SVG angle (cos/sin with 0 at +x) to [0,1)
    return wrapTurn(ang / (2 * Math.PI));
  }

  let dragging = false;
  function handleOrbitPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    orbitSvg.setPointerCapture?.(e.pointerId);
    setTurn(turnFromPointer(e.clientX, e.clientY));
  }
  function handleOrbitPointerMove(e) {
    if (!dragging) return;
    setTurn(turnFromPointer(e.clientX, e.clientY));
  }
  function handleOrbitPointerUp() {
    dragging = false;
  }
  function handleSliderInput() {
    setTurn(Number(slider.value) / 1000);
  }

  orbitSvg.addEventListener("pointerdown", handleOrbitPointerDown);
  orbitSvg.addEventListener("pointermove", handleOrbitPointerMove);
  orbitSvg.addEventListener("pointerup", handleOrbitPointerUp);
  orbitSvg.addEventListener("pointercancel", handleOrbitPointerUp);
  slider.addEventListener("input", handleSliderInput);

  container.appendChild(root);
  paint();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    orbitSvg.removeEventListener("pointerdown", handleOrbitPointerDown);
    orbitSvg.removeEventListener("pointermove", handleOrbitPointerMove);
    orbitSvg.removeEventListener("pointerup", handleOrbitPointerUp);
    orbitSvg.removeEventListener("pointercancel", handleOrbitPointerUp);
    slider.removeEventListener("input", handleSliderInput);
    root.remove();
  }

  return { setTurn, getTurn, destroy };
}
```

If `wrapTurn` is not exported, keep it module-private (already is) — the factory in the same file can call it.

**Visual note:** The shadow/terminator SVG above is a workable first cut. If Full/New look wrong in browser smoke, adjust only the face painting inside `paint()` — do not change `phaseFromTurn`.

- [x] **Step 3: Add CSS to `toy.css`**

Append:

```css
/* —— Moon phases toy (Space → Moon card) —— */
.moon-phase-toy {
  display: grid;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  padding: 0.75rem 0.9rem 0.5rem;
  box-sizing: border-box;
  align-content: center;
}

.moon-phase-face-wrap {
  text-align: center;
}

.moon-phase-face {
  width: min(42vw, 160px);
  height: auto;
  display: block;
  margin: 0 auto 0.4rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
}

.moon-phase-disk {
  fill: #e8e0d0;
}

.moon-phase-shadow {
  fill: #0b1220;
}

.moon-phase-rim {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-width: 1.5;
}

.moon-phase-name {
  margin: 0;
  font-family: "Fredoka", system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  color: #f4f0e8;
}

.moon-phase-blurb {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  line-height: 1.35;
  color: rgba(244, 240, 232, 0.85);
}

.moon-phase-orbit-wrap {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
}

.moon-phase-orbit {
  width: min(70vw, 220px);
  height: auto;
  touch-action: none;
  cursor: grab;
}

.moon-phase-orbit:active {
  cursor: grabbing;
}

.moon-phase-sun {
  fill: #ffb703;
}

.moon-phase-earth {
  fill: #3a7bd5;
}

.moon-phase-path {
  stroke: rgba(255, 255, 255, 0.28);
  stroke-width: 1.5;
  stroke-dasharray: 3 4;
}

.moon-phase-moon {
  fill: #d9d2c5;
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1;
}

.moon-phase-slider {
  width: min(70vw, 220px);
  accent-color: #ffb703;
}

.card.moon-phase-open .photo-hint,
.card.moon-phase-open .photo-nav,
.card.moon-phase-open .photo-dots {
  display: none !important;
}

.card.moon-phase-open .photo-track {
  overflow: hidden;
  display: flex;
  align-items: stretch;
}
```

If `.sr-only` already exists in `app.css` / `toy.css`, reuse it for the slider label span. Otherwise add a minimal `.sr-only` utility once. Hide `#photoCredit` from CardMedia with `els.photoCredit.hidden = true` (Task 5).

- [x] **Step 4: Run math check**

Run: `node tests/moon-phases.check.js`  
Expected: OK.

- [x] **Step 5: Commit**

```bash
git add moon-phases.js tests/moon-phases.check.js toy.css
git commit -m "$(cat <<'EOF'
feat(moon): add interactive phase toy DOM

EOF
)"
graphify update .
```

Only stage `toy.css` if your diff is **only** the phase-toy rules. If `toy.css` has unrelated WIP, extract the new rules carefully or stash unrelated hunks before commit.

---

### Task 5: Wire CardMedia (mount, speech, destroy)

**Files:**
- Modify: `card-media.js`

**Interfaces:**
- Consumes: `createMoonPhaseToy` from `./moon-phases.js`; `speakPhase`, `stopSpeech` from `./speak.js`
- Produces: Moon Place card shows toy instead of gallery; debounced `speakPhase` on phase id change (200 ms) + speak on pointer settle if needed

- [x] **Step 1: Imports**

At top of `card-media.js`:

```js
import { speakCard, speakPhase, stopSpeech } from "./speak.js";
import { createMoonPhaseToy } from "./moon-phases.js";
```

(`speakCard` / `stopSpeech` already imported — extend the speak import.)

- [x] **Step 2: State + helpers inside `createCardMedia`**

Near other `let` state:

```js
  let moonToy = null;
  let phaseSpeakTimer = 0;
  let lastSpokenPhaseId = null;

  function destroyMoonToy() {
    if (phaseSpeakTimer) {
      clearTimeout(phaseSpeakTimer);
      phaseSpeakTimer = 0;
    }
    if (moonToy) {
      moonToy.destroy();
      moonToy = null;
    }
    lastSpokenPhaseId = null;
    if (els.card) els.card.classList.remove("moon-phase-open");
    if (els.photoCredit) els.photoCredit.hidden = false;
    if (els.photoHint) els.photoHint.hidden = false;
  }

  function schedulePhaseSpeak(phase) {
    if (!phase?.id) return;
    if (phaseSpeakTimer) clearTimeout(phaseSpeakTimer);
    phaseSpeakTimer = window.setTimeout(() => {
      phaseSpeakTimer = 0;
      if (phase.id === lastSpokenPhaseId) return;
      lastSpokenPhaseId = phase.id;
      speakPhase(phase.id);
    }, 200);
  }

  function handlePhaseChange(phase) {
    schedulePhaseSpeak(phase);
  }
```

- [x] **Step 3: Branch `buildGallery` for moon**

At the start of `buildGallery(lm)`, after setting accent, if moon:

```js
    destroyMoonToy();
    if (lm.id === "moon") {
      photoCount = 0;
      photoIndex = 0;
      els.photoTrack.innerHTML = "";
      els.photoDots.innerHTML = "";
      if (els.photoCredit) {
        els.photoCredit.hidden = true;
      }
      if (els.photoHint) els.photoHint.hidden = true;
      if (els.card) els.card.classList.add("moon-phase-open");
      moonToy = createMoonPhaseToy(els.photoTrack, {
        onPhaseChange: handlePhaseChange,
      });
      // createMoonPhaseToy paint() fires onPhaseChange on first paint (lastId was null).
      updatePhotoChrome();
      return;
    }
```

Also call `destroyMoonToy()` at the beginning of every `buildGallery` so switching from Moon to another place clears the toy.

In `updatePhotoChrome`, guard when `photoCount === 0`:

```js
    if (!els.photoDots || !els.photoPrev || !els.photoNext) return;
    if (photoCount <= 0) {
      els.photoPrev.disabled = true;
      els.photoNext.disabled = true;
      if (els.photoHint) els.photoHint.textContent = "";
      return;
    }
```

- [x] **Step 4: Destroy on close**

In `close()`, after `stopSpeech()`:

```js
    destroyMoonToy();
```

- [x] **Step 5: Manual sanity (code review yourself)**

Confirm:
- Opening Eiffel still builds a normal gallery
- Opening Moon does not leave photo dots visible (`moon-phase-open` CSS)
- `Hear it` still calls `speakCard` / `stopSpeech` (stops phase clip)

No new Node test for CardMedia (needs DOM). Human smoke is Task 6.

- [x] **Step 6: Commit**

```bash
git add card-media.js
git commit -m "$(cat <<'EOF'
feat(card): mount moon phase toy on Moon place

EOF
)"
graphify update .
```

---

### Task 6: Verify

**Files:** none new (unless a fix is required)

- [x] **Step 1: Run all relevant checks**

```bash
node tests/moon-phases.check.js
node tests/speak-phase.check.js
node tests/orbit-look.check.js
node tests/space-catalog.check.js
node tests/quiz.check.js
node tests/find-progress.check.js
node tests/find-game.check.js
node tests/place-weather.check.js
node tests/traveler-orbit.check.js
node tests/space-mode.check.js
node tests/adventure.check.js
node tests/sound.check.js
node tests/card-media.check.js
```

Expected: every file prints `OK`, exit 0.

- [x] **Step 2: Graphify**

```bash
graphify update .
```

Shell: `required_permissions: ["all"]`.

- [x] **Step 3: Human smoke (report pending-human if you cannot drive the browser)**

1. Open Space → tap The Moon.
2. Confirm gallery is gone; face shows Full Moon; diagram has Moon opposite the Sun.
3. Drag Moon / scrub slider through all eight names; Luna speaks on changes (not every pixel).
4. Tap Hear — full Moon card clip plays.
5. Open another Place — toy gone, photos back.
6. Prefer-reduced-motion: drag still works (no auto-spin expected).

No commit unless a fix was required.

---

## Spec coverage checklist (author self-review)

| Spec requirement | Task |
|------------------|------|
| Space → Moon card, gallery replaced | 5 |
| Face + diagram + slider, shared `t` | 4 |
| Eight phases + bands + litFraction formula | 2 |
| Default Full (`t = 0.5`) | 4 |
| Luna `speakPhase` debounced 200 ms | 3, 5 |
| Bake clips | 3 |
| No extra WebGL / no bundler | all |
| Node math tests | 2 |
| Glossary | 1 |
| Destroy on close | 5 |
| Out of scope calendar / sun-drag sync | not scheduled |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-17-moon-phases.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
