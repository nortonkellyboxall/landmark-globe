import {
  SPACE_BODIES,
  diameterKm as spaceDiameterKm,
  orbitRadiusPct,
  orbitSpinSeconds,
  SPACE_VIEW_HINTS,
} from "./space-catalog.js";
import { createCardMedia } from "./card-media.js";
import { createGlobe } from "./globe-app.js";
import { createSound } from "./sound.js";
import { createChrome } from "./chrome.js";

const SPACE_SEL =
  ".ss-body.selected, .ss-sun.selected, .ss-size-item.selected";
const SPACE_SEL_BY_ID = (id) =>
  `.ss-body[data-id="${id}"], .ss-sun[data-id="${id}"], .ss-size-item[data-id="${id}"]`;

const DATASETS = {
  landmarks: {
    items: window.LANDMARKS || [],
    label: "Explore landmarks",
    hint: "",
    coach: "Tap the glowing dots! ✨",
    main: "landmarks",
  },
  wonders: {
    items: window.WONDERS || [],
    label: "Explore natural wonders",
    hint: "Nature’s wow places",
    coach: "Find waterfalls, mountains & more! 🌋",
    main: "wonders",
  },
  continents: {
    items: window.CONTINENTS || [],
    label: "Explore continents",
    hint: "Earth’s giant pieces",
    coach: "Tap a continent! 🗺️",
    main: "geography",
  },
  countries: {
    items: window.COUNTRIES || [],
    label: "Explore countries",
    hint: "Countries around the world",
    coach: "Pick a country flag! 🏳️",
    main: "geography",
  },
  space: {
    items: SPACE_BODIES,
    label: "Explore the solar system",
    hint: "Meet the planets",
    coach: "Tap a planet to learn! 🚀",
    main: "space",
  },
};

let activeTab = "landmarks";
let places = DATASETS.landmarks.items;
let globe = null;
let selectedId = null;
let coachHidden = false;
let nightMode = false;
let globeReady = false;
let spaceTransitioning = false;
const sound = createSound();

const els = {
  loader: document.getElementById("loader"),
  globeViz: document.getElementById("globeViz"),
  globeShadow: document.getElementById("globeShadow"),
  spaceHandoff: document.getElementById("spaceHandoff"),
  nightBtn: document.getElementById("nightBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  adventuresBtn: document.getElementById("adventuresBtn"),
  adventureNav: document.getElementById("adventureNav"),
  videoFallback: document.getElementById("videoFallback"),
  videoFallbackHear: document.getElementById("videoFallbackHear"),
  solarSystem: document.getElementById("solarSystem"),
  ssScene: document.getElementById("ssScene"),
  ssViewOrbits: document.getElementById("ssViewOrbits"),
  ssViewSizes: document.getElementById("ssViewSizes"),
  ssViewIso: document.getElementById("ssViewIso"),
  ssSizesRow: document.getElementById("ssSizesRow"),
  ss3d: document.getElementById("ss3d"),
  ssHint: document.getElementById("ssHint"),
  spaceSubtabs: document.getElementById("spaceSubtabs"),
  subOrbits: document.getElementById("subOrbits"),
  subSizes: document.getElementById("subSizes"),
  subSpheres: document.getElementById("subSpheres"),
  stars: document.getElementById("stars"),
  sparkles: document.getElementById("sparkles"),
  coach: document.getElementById("coach"),
  strip: document.getElementById("strip"),
  exploreLabel: document.getElementById("exploreLabel"),
  brandHint: document.getElementById("brandHint"),
  tabLandmarks: document.getElementById("tabLandmarks"),
  tabWonders: document.getElementById("tabWonders"),
  tabGeography: document.getElementById("tabGeography"),
  tabSpace: document.getElementById("tabSpace"),
  geoSubtabs: document.getElementById("geoSubtabs"),
  subContinents: document.getElementById("subContinents"),
  subCountries: document.getElementById("subCountries"),
  overlay: document.getElementById("overlay"),
  card: document.getElementById("card"),
  cardClose: document.getElementById("cardClose"),
  cardHero: document.getElementById("cardHero"),
  photoTrack: document.getElementById("photoTrack"),
  photoPrev: document.getElementById("photoPrev"),
  photoNext: document.getElementById("photoNext"),
  photoDots: document.getElementById("photoDots"),
  photoHint: document.getElementById("photoHint"),
  cardTitle: document.getElementById("cardTitle"),
  cardPlace: document.getElementById("cardPlace"),
  cardStory: document.getElementById("cardStory"),
  cardWow: document.getElementById("cardWow"),
  videoPanel: document.getElementById("videoPanel"),
  videoStart: document.getElementById("videoStart"),
  videoNote: document.getElementById("videoNote"),
  watchBtn: document.getElementById("watchBtn"),
  anthemBtn: document.getElementById("anthemBtn"),
  cardMoreBtn: document.getElementById("cardMoreBtn"),
  cardMore: document.getElementById("cardMore"),
  muteBtn: document.getElementById("muteBtn"),
  muteIcon: document.getElementById("muteIcon"),
  muteLabel: document.getElementById("muteLabel"),
  surpriseBtn: document.getElementById("surpriseBtn"),
  surpriseIcon: document.getElementById("surpriseIcon"),
  speakBtn: document.getElementById("speakBtn"),
};

const chrome = createChrome(els);
const { setPanelOpen, closeChromeMenus } = chrome;

/* —— Stars —— */
function makeStars() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 70; i++) {
    const s = document.createElement("span");
    s.className = "star" + (i % 7 === 0 ? " big" : "");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 70 + "%";
    s.style.setProperty("--dur", 2.2 + Math.random() * 3.5 + "s");
    s.style.setProperty("--delay", Math.random() * 4 + "s");
    frag.appendChild(s);
  }
  els.stars.appendChild(frag);
}

function shootingStar() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const star = document.createElement("div");
  star.className = "shooting-star";
  star.style.left = 10 + Math.random() * 60 + "%";
  star.style.top = 5 + Math.random() * 35 + "%";
  els.stars.appendChild(star);
  requestAnimationFrame(() => star.classList.add("go"));
  setTimeout(() => star.remove(), 1200);
}

function setAmbientForMode() {
  sound.setAmbientForMode({ activeTab, selectedId });
}
const playPop = () => sound.playPop();
const playChime = () => sound.playChime();
const playFlyWhoosh = () => sound.playFlyWhoosh();

/* —— Sparkles —— */
function sparkAt(x, y) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 12; i++) {
    const sp = document.createElement("span");
    sp.className = "spark";
    const angle = (Math.PI * 2 * i) / 12;
    const dist = 28 + Math.random() * 36;
    sp.style.left = x + "px";
    sp.style.top = y + "px";
    sp.style.setProperty("--sx", Math.cos(angle) * dist + "px");
    sp.style.setProperty("--sy", Math.sin(angle) * dist + "px");
    sp.style.background = i % 2 ? "#ffc857" : "#fff";
    els.sparkles.appendChild(sp);
    setTimeout(() => sp.remove(), 750);
  }
}

/* —— Strip —— */
function buildStrip() {
  els.strip.innerHTML = "";
  places.forEach((lm) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    btn.dataset.id = lm.id;
    btn.title = lm.name;
    btn.innerHTML = `<span class="te">${lm.emoji}</span><span class="tn">${lm.name}</span>`;
    btn.addEventListener("click", () => openLandmark(lm.id, btn));
    els.strip.appendChild(btn);
  });
}

function syncStrip() {
  els.strip.querySelectorAll(".thumb").forEach((t) => {
    t.classList.toggle("active", t.dataset.id === selectedId);
  });
}

/* scrollIntoView on thumbs also scrolls the page sideways — keep it in the strip */
function scrollStripToId(id) {
  const thumb = els.strip.querySelector(`[data-id="${id}"]`);
  if (!thumb) return;
  const strip = els.strip;
  const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
  strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  window.scrollTo(0, 0);
}

/* —— CardMedia —— */
const card = createCardMedia(els, {
  playPop,
  playChime,
  onClose() {
    selectedId = null;
    document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
    document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
    syncStrip();
    if (activeTab !== "space" && globe) globe.setAutoRotate(true);
  },
});

/* —— Solar system —— */
let spaceView = "spheres";

function bindSpacePick(el, obj) {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    openLandmark(obj.id, el);
  });
}

function makeOrbitBody(obj, spinSec, phaseSec) {
  const body = document.createElement("button");
  body.type = "button";
  body.className =
    "ss-body" +
    (obj.id === "saturn" ? " saturn" : "") +
    (obj.kind === "comet" ? " comet" : "");
  body.dataset.id = obj.id;
  body.setAttribute("aria-label", obj.name);
  const sizeScale = obj.kind === "belt" ? 0.7 : 0.78;
  body.style.setProperty("--size", Math.max(16, Math.round(obj.size * sizeScale)) + "px");
  body.style.setProperty("--color", obj.color);
  body.style.setProperty("--spin", spinSec + "s");
  body.style.setProperty("--phase", (phaseSec || 0) + "s");
  body.innerHTML = `<span aria-hidden="true">${obj.emoji}</span><span class="ss-label">${obj.name.replace(/^The /, "")}</span>`;
  bindSpacePick(body, obj);
  return body;
}

function buildOrbitView() {
  if (!els.ssScene) return;
  els.ssScene.innerHTML = "";

  const note = document.createElement("div");
  note.className = "ss-orbit-note";
  note.textContent = "Looking straight down · closer = faster year";
  els.ssScene.appendChild(note);

  const byId = Object.fromEntries(DATASETS.space.items.map((o) => [o.id, o]));

  DATASETS.space.items.forEach((obj, index) => {
    if (obj.kind === "star") {
      const sun = document.createElement("button");
      sun.type = "button";
      sun.className = "ss-sun";
      sun.dataset.id = obj.id;
      sun.setAttribute("aria-label", obj.name);
      sun.style.setProperty("--size", Math.round(obj.size * 0.75) + "px");
      sun.innerHTML = `<span aria-hidden="true">${obj.emoji}</span><span class="ss-label">${obj.name}</span>`;
      bindSpacePick(sun, obj);
      els.ssScene.appendChild(sun);
      return;
    }

    // Moon nests on Earth (not its own solar orbit)
    if (obj.id === "moon") return;

    const au = obj.au;
    if (au == null) return;

    const years = obj.orbitYears || 1;
    const spinSec = orbitSpinSeconds(years);
    const phaseSec = -((index * 2.7) % spinSec);
    const rPct = orbitRadiusPct(au);

    const orbit = document.createElement("div");
    orbit.className = "ss-orbit" + (obj.kind === "belt" ? " belt" : "");
    orbit.style.setProperty("--r", rPct.toFixed(2) + "%");
    orbit.style.setProperty("--spin", spinSec + "s");
    orbit.style.setProperty("--phase", phaseSec + "s");

    const body = makeOrbitBody(obj, spinSec, phaseSec);
    if (obj.kind === "belt") body.style.setProperty("--size", "22px");
    orbit.appendChild(body);

    if (obj.id === "earth" && byId.moon) {
      const moonSpin = orbitSpinSeconds(byId.moon.orbitYears || 0.075);
      const moonOrbit = document.createElement("div");
      moonOrbit.className = "ss-moon-orbit";
      moonOrbit.style.setProperty("--moon-spin", moonSpin + "s");
      moonOrbit.appendChild(makeOrbitBody(byId.moon, moonSpin, 0));
      body.appendChild(moonOrbit);
    }

    if (obj.kind === "comet") {
      const wrap = document.createElement("div");
      wrap.className = "ss-comet-wrap";
      wrap.style.setProperty("--r", rPct.toFixed(2) + "%");
      // reset orbit to fill the wrap
      orbit.style.setProperty("--r", "100%");
      wrap.appendChild(orbit);
      els.ssScene.appendChild(wrap);
      return;
    }

    els.ssScene.appendChild(orbit);
  });
}

function planetDisplayPx(km, jupKm, maxPx) {
  // Linear vs Jupiter, with a tiny floor so Mercury stays visible
  return Math.max(8, Math.round((km / jupKm) * maxPx));
}

function buildSizesView() {
  if (!els.ssSizesRow) return;
  els.ssSizesRow.innerHTML = "";
  const items = DATASETS.space.items.filter((o) =>
    o.kind === "star" || o.kind === "planet" || o.kind === "moon"
  );
  const jupKm = spaceDiameterKm("jupiter");
  const maxPlanetPx = 132;
  const sunMaxPx = 170;

  items.forEach((obj) => {
    const km = spaceDiameterKm(obj);
    const px = obj.kind === "star" ? sunMaxPx : planetDisplayPx(km, jupKm, maxPlanetPx);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ss-size-item" + (obj.kind === "star" ? " sun" : "") + (obj.id === "saturn" ? " saturn" : "");
    btn.dataset.id = obj.id;
    btn.setAttribute("aria-label", obj.name + " size comparison");

    const ball = document.createElement("span");
    ball.className = "ss-size-ball";
    ball.style.width = px + "px";
    ball.style.height = px + "px";
    ball.style.setProperty("--ball", obj.color);

    const name = document.createElement("span");
    name.className = "ss-size-name";
    name.textContent = obj.name.replace(/^The /, "");

    const meta = document.createElement("span");
    meta.className = "ss-size-meta";
    if (obj.kind === "star") {
      meta.textContent = "Much bigger!";
    } else if (obj.id === "earth") {
      meta.textContent = "Our home";
    } else {
      const ratio = km / spaceDiameterKm("earth");
      meta.textContent = ratio >= 1
        ? (Math.round(ratio * 10) / 10) + "× Earth"
        : Math.round(ratio * 100) + "% Earth";
    }

    btn.appendChild(ball);
    btn.appendChild(name);
    btn.appendChild(meta);
    bindSpacePick(btn, obj);
    els.ssSizesRow.appendChild(btn);
  });
}

let solar3dLoading = null;
let Solar3D = null;

function loadSolar3DModule() {
  if (Solar3D) return Promise.resolve(Solar3D);
  if (solar3dLoading) return solar3dLoading;
  solar3dLoading = import("./solar3d.js").then((mod) => {
    Solar3D = mod;
    return Solar3D;
  });
  return solar3dLoading;
}

async function ensureSolar3D(opts) {
  if (!els.ss3d) return;
  const introZoom = !!(opts && opts.introZoom);
  try {
    await loadSolar3DModule();
  } catch (err) {
    console.warn("Solar3D failed to load", err);
    return;
  }
  if (!Solar3D) return;
  if (els.ss3d.dataset.ready === "1") {
    Solar3D.resize();
    Solar3D.setActive(true);
    if (introZoom && Solar3D.playIntroZoom) Solar3D.playIntroZoom();
    return;
  }
  Solar3D.init(els.ss3d, {
    introZoom,
    onSelect: (id) => {
      const obj = DATASETS.space.items.find((p) => p.id === id);
      if (!obj) return;
      const rect = els.ss3d.getBoundingClientRect();
      sparkAt(rect.left + rect.width / 2, rect.top + rect.height * 0.4);
      openLandmark(id);
    },
  });
  els.ss3d.dataset.ready = "1";
}

function buildSolarSystem() {
  buildOrbitView();
  buildSizesView();
}

function setSpaceView(view, opts) {
  if (!["orbits", "sizes", "spheres"].includes(view)) return;
  const changed = spaceView !== view;
  spaceView = view;
  const views = [
    [els.ssViewOrbits, "orbits"],
    [els.ssViewSizes, "sizes"],
    [els.ssViewIso, "spheres"],
  ];
  views.forEach(([el, key]) => {
    if (!el) return;
    const on = key === view;
    el.classList.toggle("active", on);
    el.setAttribute("aria-hidden", String(!on));
  });
  els.subOrbits.classList.toggle("active", view === "orbits");
  els.subSizes.classList.toggle("active", view === "sizes");
  els.subSpheres.classList.toggle("active", view === "spheres");
  els.subOrbits.setAttribute("aria-selected", String(view === "orbits"));
  els.subSizes.setAttribute("aria-selected", String(view === "sizes"));
  els.subSpheres.setAttribute("aria-selected", String(view === "spheres"));
  if (els.ssHint) els.ssHint.textContent = SPACE_VIEW_HINTS[view] || SPACE_VIEW_HINTS.orbits;

  if (view === "spheres") {
    requestAnimationFrame(() => ensureSolar3D({ introZoom: !!(opts && opts.introZoom) }));
  } else if (Solar3D) {
    Solar3D.setActive(false);
  }

  if (changed && !(opts && opts.silent)) playPop();
}

function enterSpaceMode() {
  if (spaceTransitioning) return;
  spaceTransitioning = true;
  document.body.classList.add("space-mode");
  els.solarSystem.hidden = false;
  if (els.spaceSubtabs) els.spaceSubtabs.classList.add("show");
  if (els.nightBtn) els.nightBtn.style.display = "none";
  if (els.spaceHandoff) els.spaceHandoff.classList.add("show");
  playFlyWhoosh();
  setAmbientForMode();

  if (globe) {
    globe.setAutoRotate(false);
    globe.setPlaces([]);
    const pov = globe.pointOfView();
    globe.pointOfView(pov.lat || 15, pov.lng || 10, 2.4, 0);
    globe.pointOfView(12, 20, 9.5, 1700);
  }

  // Prefetch 3D module during zoom-out
  loadSolar3DModule().catch(() => {});

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zoomMs = reduce ? 200 : 1600;
  if (reduce && globe) {
    globe.pointOfView(12, 20, 9.5, 0);
  }
  window.setTimeout(() => {
    els.globeViz.classList.add("hidden-view");
    if (els.globeShadow) els.globeShadow.classList.add("hidden-view");
    if (globe) globe.setActive(false);
    els.solarSystem.classList.add("show");
    setSpaceView(spaceView || "spheres", { silent: true, introZoom: !reduce });
    if (els.spaceHandoff) {
      window.setTimeout(() => els.spaceHandoff.classList.remove("show"), reduce ? 0 : 500);
    }
    spaceTransitioning = false;
  }, zoomMs);
}

function leaveSpaceMode() {
  document.body.classList.remove("space-mode");
  els.solarSystem.classList.remove("show");
  if (els.spaceSubtabs) els.spaceSubtabs.classList.remove("show");
  if (els.spaceHandoff) els.spaceHandoff.classList.remove("show");
  if (Solar3D) Solar3D.setActive(false);
  els.globeViz.classList.remove("hidden-view");
  if (els.globeShadow) els.globeShadow.classList.remove("hidden-view");
  if (els.nightBtn) els.nightBtn.style.display = "";
  if (globe) {
    globe.setActive(true);
    globe.setNight(nightMode);
  }
  playFlyWhoosh();
  window.setTimeout(() => {
    if (activeTab !== "space") els.solarSystem.hidden = true;
  }, 750);
}

/* —— Globe helpers —— */
function hideCoach() {
  if (coachHidden) return;
  coachHidden = true;
  els.coach.classList.add("hide");
  setTimeout(() => els.coach.remove(), 450);
}

function openLandmark(id, sourceEl) {
  const lm = places.find((l) => l.id === id);
  if (!lm) return;

  hideCoach();
  selectedId = id;
  document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
  document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
  const pin = document.querySelector(`.pin[data-id="${id}"]`);
  if (pin) pin.classList.add("selected");
  document.querySelectorAll(SPACE_SEL_BY_ID(id)).forEach((el) => el.classList.add("selected"));
  if (Solar3D) Solar3D.highlight(id);
  syncStrip();

  playPop();
  playFlyWhoosh();
  if (sound.isSoundOn()) setAmbientForMode();

  if (activeTab === "space") {
    setTimeout(() => card.openPlaceCard(lm), 220);
    scrollStripToId(id);
    return;
  }

  if (!globe) return;
  globe.setAutoRotate(false);
  const alt = activeTab === "countries" ? 1.35 : activeTab === "continents" ? 1.9 : 1.55;
  globe.pointOfView(lm.lat, lm.lng, alt, 1400);
  setTimeout(() => card.openPlaceCard(lm), 900);

  scrollStripToId(id);
}

function randomLandmark(excludeId) {
  const pool = places.filter((l) => l.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function surprise() {
  els.surpriseIcon.style.display = "inline-block";
  els.surpriseIcon.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 450, easing: "ease-out" }
  );
  const next = randomLandmark(selectedId);
  if (next) openLandmark(next.id);
}

function staggerPinPlaces(items) {
  if (!items || items.length < 2) return items;
  // Nudge overlapping country/continent pins so taps are easier
  const out = items.map((it) => Object.assign({}, it));
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i];
      const b = out[j];
      if (a.lat == null || b.lat == null) continue;
      const dLat = a.lat - b.lat;
      const dLng = a.lng - b.lng;
      const dist = Math.hypot(dLat, dLng * Math.cos((a.lat * Math.PI) / 180));
      if (dist < 9) {
        const nudge = (10 - dist) * 0.35;
        const ang = Math.atan2(dLng || 0.01, dLat || 0.01) + i * 0.4;
        b.lat = Math.max(-80, Math.min(80, b.lat - Math.cos(ang) * nudge));
        b.lng = ((b.lng - Math.sin(ang) * nudge + 540) % 360) - 180;
      }
    }
  }
  return out;
}

function switchTab(tab) {
  if (!DATASETS[tab] || tab === activeTab) return;
  card.close();
  const leavingSpace = activeTab === "space";
  const enteringSpace = tab === "space";
  activeTab = tab;
  places = DATASETS[tab].items;
  const main = DATASETS[tab].main;

  els.tabLandmarks.classList.toggle("active", main === "landmarks");
  els.tabWonders.classList.toggle("active", main === "wonders");
  els.tabGeography.classList.toggle("active", main === "geography");
  els.tabSpace.classList.toggle("active", main === "space");
  els.tabLandmarks.setAttribute("aria-selected", String(main === "landmarks"));
  els.tabWonders.setAttribute("aria-selected", String(main === "wonders"));
  els.tabGeography.setAttribute("aria-selected", String(main === "geography"));
  els.tabSpace.setAttribute("aria-selected", String(main === "space"));

  els.geoSubtabs.classList.toggle("show", main === "geography");
  if (els.spaceSubtabs) els.spaceSubtabs.classList.toggle("show", main === "space");
  els.subContinents.classList.toggle("active", tab === "continents");
  els.subCountries.classList.toggle("active", tab === "countries");
  els.subContinents.setAttribute("aria-selected", String(tab === "continents"));
  els.subCountries.setAttribute("aria-selected", String(tab === "countries"));

  els.exploreLabel.textContent = DATASETS[tab].label;
  els.brandHint.textContent = DATASETS[tab].hint;
  if (els.adventuresBtn) {
    els.adventuresBtn.classList.toggle("active-mode", main !== "landmarks");
  }
  setPanelOpen(els.adventureNav, els.adventuresBtn, false);
  setPanelOpen(els.settingsPanel, els.settingsBtn, false);

  if (els.coach && !coachHidden) {
    els.coach.textContent = DATASETS[tab].coach;
  }

  buildStrip();

  if (enteringSpace) {
    enterSpaceMode();
  } else {
    if (leavingSpace) leaveSpaceMode();
    if (els.spaceSubtabs) els.spaceSubtabs.classList.remove("show");
    if (globe) {
      const pinData =
        tab === "countries" || tab === "continents" ? staggerPinPlaces(places) : places;
      globe.setPlaces(pinData);
      const views = {
        landmarks: [20, 20, 2.2],
        wonders: [10, 30, 2.25],
        continents: [15, 20, 2.35],
        countries: [18, 12, 1.85],
      };
      const v = views[tab] || views.landmarks;
      globe.pointOfView(v[0], v[1], v[2], leavingSpace ? 1100 : 900);
      globe.setAutoRotate(true);
    }
    setAmbientForMode();
  }
  playPop();
}

/* —— Night lights chrome (materials live in globe-app) —— */
function applyNightMode(on) {
  nightMode = !!on;
  if (els.nightBtn) {
    els.nightBtn.setAttribute("aria-pressed", String(nightMode));
    const icon = document.getElementById("nightIcon");
    if (icon) icon.textContent = nightMode ? "☀️" : "🌙";
  }
  if (globe) globe.setNight(nightMode);
}

function toggleNightMode() {
  applyNightMode(!nightMode);
  playPop();
}

/* —— Init globe —— */
function markGlobeReady() {
  if (globeReady) return;
  globeReady = true;
  els.loader.classList.add("hide");
}

function initGlobe() {
  globe = createGlobe(els.globeViz, {
    places,
    onSelect: (id) => openLandmark(id),
    sparkAt,
    onReady: markGlobeReady,
    hasSelection: () => !!selectedId,
  });
  applyNightMode(false);
}

/* —— Events —— */
els.surpriseBtn.addEventListener("click", surprise);
if (els.nightBtn) els.nightBtn.addEventListener("click", toggleNightMode);

els.settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = !els.settingsPanel.classList.contains("open");
  setPanelOpen(els.adventureNav, els.adventuresBtn, false);
  setPanelOpen(els.settingsPanel, els.settingsBtn, open);
});
els.adventuresBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = !els.adventureNav.classList.contains("open");
  setPanelOpen(els.settingsPanel, els.settingsBtn, false);
  setPanelOpen(els.adventureNav, els.adventuresBtn, open);
});
document.addEventListener("click", (e) => {
  if (
    els.settingsPanel.classList.contains("open") &&
    !els.settingsPanel.contains(e.target) &&
    !els.settingsBtn.contains(e.target)
  ) {
    setPanelOpen(els.settingsPanel, els.settingsBtn, false);
  }
  if (
    els.adventureNav.classList.contains("open") &&
    !els.adventureNav.contains(e.target) &&
    !els.adventuresBtn.contains(e.target)
  ) {
    setPanelOpen(els.adventureNav, els.adventuresBtn, false);
  }
});

els.tabLandmarks.addEventListener("click", () => switchTab("landmarks"));
els.tabWonders.addEventListener("click", () => switchTab("wonders"));
els.tabSpace.addEventListener("click", () => switchTab("space"));
els.subOrbits.addEventListener("click", () => setSpaceView("orbits"));
els.subSizes.addEventListener("click", () => setSpaceView("sizes"));
els.subSpheres.addEventListener("click", () => setSpaceView("spheres"));
els.tabGeography.addEventListener("click", () => {
  // Keep current geo mode if already in geography, else start on continents
  if (DATASETS[activeTab].main === "geography") {
    setPanelOpen(els.adventureNav, els.adventuresBtn, false);
    return;
  }
  switchTab("continents");
});
els.subContinents.addEventListener("click", () => switchTab("continents"));
els.subCountries.addEventListener("click", () => switchTab("countries"));

els.muteBtn.addEventListener("click", () => {
  const nextOn = !sound.isSoundOn();
  sound.setSoundOn(nextOn);
  if (nextOn) {
    sound.ensureAudio();
    setAmbientForMode();
    playPop();
  } else {
    sound.stopAmbient();
  }
  els.muteBtn.setAttribute("aria-pressed", String(!nextOn));
  els.muteIcon.textContent = nextOn ? "🔊" : "🔇";
  if (els.muteLabel) els.muteLabel.textContent = nextOn ? "Sound on" : "Sound off";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (els.settingsPanel.classList.contains("open") || els.adventureNav.classList.contains("open")) {
      closeChromeMenus();
      return;
    }
    if (!card.tryDismiss()) card.close();
    return;
  }
  const cardOpen = els.card.classList.contains("open");
  if (e.key === " " && !e.repeat && !cardOpen) {
    e.preventDefault();
    surprise();
  }
});

// Warm speech voices
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

makeStars();
buildStrip();
buildSolarSystem();
initGlobe();
setInterval(shootingStar, 28000);
setTimeout(shootingStar, 8000);
