/** Globe — Earth look adapter over the shared Solar3D world. */

import * as Solar3D from "./solar3d.js";
import { skyShowLook as terminatorLook, subsolarPoint } from "./orbit-look.js";
import { travelerPos } from "./traveler-orbit.js";

/**
 * @param {HTMLElement} el
 * @param {{
 *   onSelect?: (id: string, sourceEl?: HTMLElement) => void,
 *   sparkAt?: (x: number, y: number) => void,
 *   onReady?: () => void,
 *   onPov?: (pov: { lat: number, lng: number, altitude: number }) => void,
 *   hasSelection?: () => boolean,
 *   isFound?: (id: string) => boolean,
 *   places?: object[],
 * }} opts
 */
export function createGlobe(el, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const sparkAt = opts.sparkAt || (() => {});
  const onReady = opts.onReady || (() => {});
  const onPov = opts.onPov || (() => {});
  const hasSelection = opts.hasSelection || (() => false);
  const isFound = opts.isFound || (() => false);

  let places = opts.places || [];
  let engineActive = true;
  let ready = false;
  let resumeTimer = null;
  let pinRaf = 0;
  const pinEls = new Map();

  const traveler = {
    id: "iss",
    name: "Space station",
    emoji: "🛰️",
    color: "#dfe7ee",
    kind: "traveler",
    lat: 0,
    lng: 0,
  };

  el.style.position = el.style.position || "relative";

  function markReady() {
    if (ready) return;
    ready = true;
    onReady();
  }

  function pinList() {
    return places.length ? places.concat(traveler) : [];
  }

  function ensurePinLayer() {
    let layer = el.querySelector(".pin-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "pin-layer";
      el.appendChild(layer);
    }
    return layer;
  }

  let pinLayer = null;

  function createPin(lm, index) {
    const pinEl = document.createElement("button");
    pinEl.type = "button";
    const travelerPin = lm.kind === "traveler";
    pinEl.className = "pin" + (travelerPin ? " pin-iss" : index < 4 ? " pin-bounce" : "");
    pinEl.dataset.id = lm.id;
    pinEl.setAttribute("aria-label", lm.name);
    pinEl.style.setProperty("--pin-color", lm.color === "#ffffff" ? "#dfe7ee" : lm.color);
    pinEl.style.setProperty("--delay", (index % 8) * 0.18 + "s");
    if (!travelerPin && isFound(lm.id)) pinEl.classList.add("found");
    pinEl.innerHTML = `
      <span class="pin-inner">
        <span class="pin-glow"></span>
        <span class="pin-emoji">${lm.emoji}</span>
      </span>
      <span class="pin-stamp" aria-hidden="true">⭐</span>
    `;
    pinEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = pinEl.getBoundingClientRect();
      sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      onSelect(lm.id, pinEl);
    });
    return pinEl;
  }

  function rebuildPins() {
    pinLayer = ensurePinLayer();
    pinLayer.innerHTML = "";
    pinEls.clear();
    pinList().forEach((lm) => {
      const pinEl = createPin(lm, places.findIndex((p) => p.id === lm.id));
      pinLayer.appendChild(pinEl);
      pinEls.set(lm.id, { el: pinEl, place: lm });
    });
  }

  function syncPins() {
    if (!engineActive) return;
    pinLayer = ensurePinLayer();
    const next = travelerPos(performance.now() / 1000);
    traveler.lat = next.lat;
    traveler.lng = next.lng;
    const solarMode = typeof Solar3D.getViewMode === "function" && Solar3D.getViewMode() === "solar";
    pinLayer.style.display = solarMode || !places.length ? "none" : "";
    if (solarMode) return;
    pinEls.forEach((entry) => {
      const lm = entry.place.id === "iss" ? traveler : entry.place;
      const alt = lm.kind === "traveler" ? 0.16 : 0.02;
      const projected = Solar3D.projectEarthLatLng(lm.lat, lm.lng, alt);
      if (!projected || !projected.visible) {
        entry.el.style.opacity = "0";
        entry.el.style.pointerEvents = "none";
        return;
      }
      entry.el.style.opacity = "1";
      entry.el.style.pointerEvents = "auto";
      entry.el.style.left = projected.x + "px";
      entry.el.style.top = projected.y + "px";
    });
  }

  function stopPinLoop() {
    if (pinRaf) {
      cancelAnimationFrame(pinRaf);
      pinRaf = 0;
    }
  }

  function startPinLoop() {
    if (!engineActive || pinRaf) return;
    (function tick() {
      if (!engineActive) {
        pinRaf = 0;
        return;
      }
      syncPins();
      pinRaf = requestAnimationFrame(tick);
    })();
  }

  function handlePov(pov) {
    if (pov && Number.isFinite(pov.altitude)) Solar3D.setEarthLookBand(pov.altitude);
    onPov(pov);
  }

  Solar3D.init(el, {
    startActive: true,
    viewMode: "earth",
    earthLook: { lat: 16, lng: -22, altitude: 2.4 },
    onPov: handlePov,
    onSelect: (id) => {
      onSelect(id);
    },
  });
  el.dataset.ready = "1";
  // init() clears container HTML — pin layer must be created after
  pinLayer = ensurePinLayer();
  Solar3D.setOnPov(handlePov);
  Solar3D.setViewMode("earth", { animate: false });
  Solar3D.setEarthLook(16, -22, 2.4, 0);
  rebuildPins();
  startPinLoop();
  setTimeout(markReady, 600);
  setTimeout(markReady, 4000);

  function setPlaces(nextPlaces) {
    places = nextPlaces || [];
    rebuildPins();
  }

  function setNight(on) {
    Solar3D.setEarthNight(!!on);
  }

  function setActive(active) {
    engineActive = !!active;
    Solar3D.setActive(engineActive);
    if (engineActive) startPinLoop();
    else stopPinLoop();
  }

  function setAutoRotate(on) {
    Solar3D.setAutoRotate(!!on);
  }

  function pauseAutoRotateTemporarily(holdMs) {
    setAutoRotate(false);
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!hasSelection()) setAutoRotate(true);
    }, holdMs || 4000);
  }

  function pointOfView(lat, lng, altitude, ms) {
    if (arguments.length === 0) return Solar3D.getEarthPov();
    if (ms > 400) pauseAutoRotateTemporarily(Math.max(4000, ms + 500));
    Solar3D.setEarthLook(lat, lng, altitude, ms || 0);
    return Solar3D.getEarthPov();
  }

  function punch() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pov = Solar3D.getEarthPov();
    const alt = pov.altitude || 2.2;
    Solar3D.setEarthLook(pov.lat, pov.lng, Math.max(1.15, alt * 0.84), 260);
    setTimeout(() => {
      Solar3D.setEarthLook(pov.lat, pov.lng, alt, 520);
    }, 280);
  }

  let sunHours = 0;

  function lockRadar(lat, lng) {
    Solar3D.lockRadar(lat, lng);
  }

  function setWeather(lat, lng, kind) {
    Solar3D.setWeather(lat, lng, kind);
  }

  function setSunHours(hours) {
    sunHours = Number.isFinite(hours) ? hours : 0;
    Solar3D.setSunHours(sunHours);
  }

  return {
    setPlaces,
    setNight,
    setActive,
    setAutoRotate,
    pointOfView,
    punch,
    lockRadar,
    setWeather,
    setSunHours,
    skyShowLook() {
      return terminatorLook(subsolarPoint(new Date(Date.now() + sunHours * 3600000)));
    },
  };
}
