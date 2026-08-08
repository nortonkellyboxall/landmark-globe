import {
  SPACE_BODIES,
  diameterKm as spaceDiameterKm,
} from "./space-catalog.js";
import { createCardMedia } from "./card-media.js";
import { createGlobe } from "./globe-app.js";
import { createSound } from "./sound.js";
import { createChrome } from "./chrome.js";
import { createFindQuiz } from "./quiz.js";
import { speakName } from "./speak.js";

const SPACE_SEL = ".ss-size-item.selected";
const SPACE_SEL_BY_ID = (id) => `.ss-size-item[data-id="${id}"]`;

const DATASETS = {
  landmarks: {
    items: window.LANDMARKS || [],
    label: "🏛️ Landmarks",
    hint: "",
    main: "landmarks",
  },
  wonders: {
    items: window.WONDERS || [],
    label: "🌋 Natural wonders",
    hint: "Nature’s wow places",
    main: "wonders",
  },
  continents: {
    items: window.CONTINENTS || [],
    label: "🌍 Continents",
    hint: "Earth’s giant pieces",
    main: "continents",
  },
  countries: {
    items: window.COUNTRIES || [],
    label: "🚩 Countries",
    hint: "Countries around the world",
    main: "countries",
  },
  space: {
    items: SPACE_BODIES,
    label: "🚀 Space",
    hint: "Meet the planets",
    main: "space",
  },
};

let activeTab = "landmarks";
let places = DATASETS.landmarks.items;
let globe = null;
let selectedId = null;
let nightMode = false;
let autoNight = true;
let landmarkFilter = null;
let globeReady = false;
let spaceTransitioning = false;
const sound = createSound();

function isBedtimeHour(date = new Date()) {
  const h = date.getHours();
  return h >= 19 || h < 6;
}

function placesForContinent(continentId) {
  const filterPack = (all) => {
    if (continentId === "northamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat >= 7);
    }
    if (continentId === "southamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat < 7);
    }
    const label = {
      africa: "Africa",
      asia: "Asia",
      europe: "Europe",
      oceania: "Oceania",
      antarctica: "Antarctica",
    }[continentId];
    if (!label) return [];
    return all.filter((l) => l.continent === label);
  };
  return [...filterPack(DATASETS.landmarks.items), ...filterPack(DATASETS.wonders.items)];
}

const els = {
  loader: document.getElementById("loader"),
  globeViz: document.getElementById("globeViz"),
  globeShadow: document.getElementById("globeShadow"),
  spaceHandoff: document.getElementById("spaceHandoff"),
  nightBtn: document.getElementById("nightBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  adventureNav: document.getElementById("adventureNav"),
  videoFallback: document.getElementById("videoFallback"),
  videoFallbackHear: document.getElementById("videoFallbackHear"),
  solarSystem: document.getElementById("solarSystem"),
  ssViewIso: document.getElementById("ssViewIso"),
  ssSizesPanel: document.getElementById("ssSizesPanel"),
  ssSizesToggle: document.getElementById("ssSizesToggle"),
  ssSizesRow: document.getElementById("ssSizesRow"),
  ss3d: document.getElementById("ss3d"),
  stars: document.getElementById("stars"),
  sparkles: document.getElementById("sparkles"),
  strip: document.getElementById("strip"),
  exploreLabel: document.getElementById("exploreLabel"),
  brandHint: document.getElementById("brandHint"),
  tabLandmarks: document.getElementById("tabLandmarks"),
  tabWonders: document.getElementById("tabWonders"),
  tabContinents: document.getElementById("tabContinents"),
  tabCountries: document.getElementById("tabCountries"),
  tabSpace: document.getElementById("tabSpace"),
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
  showPlacesBtn: document.getElementById("showPlacesBtn"),
  cardMoreBtn: document.getElementById("cardMoreBtn"),
  cardMore: document.getElementById("cardMore"),
  muteBtn: document.getElementById("muteBtn"),
  muteIcon: document.getElementById("muteIcon"),
  autoNightBtn: document.getElementById("autoNightBtn"),
  autoNightLabel: document.getElementById("autoNightLabel"),
  surpriseBtn: document.getElementById("surpriseBtn"),
  surpriseIcon: document.getElementById("surpriseIcon"),
  findBtn: document.getElementById("findBtn"),
  findPrompt: document.getElementById("findPrompt"),
  findExit: document.getElementById("findExit"),
  findCue: document.getElementById("findCue"),
  findEmoji: document.getElementById("findEmoji"),
  findPhoto: document.getElementById("findPhoto"),
  findHear: document.getElementById("findHear"),
  findAgain: document.getElementById("findAgain"),
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
const playBoop = () => sound.playBoop();
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
  placesForContinent,
  onShowPlaces(place) {
    showPlacesInContinent(place);
  },
  onClose() {
    selectedId = null;
    document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
    document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
    syncStrip();
    if (activeTab !== "space" && globe) globe.setAutoRotate(true);
  },
});

function showPlacesInContinent(place) {
  const hits = placesForContinent(place.id);
  if (!hits.length) return;
  stopFindQuiz();
  landmarkFilter = place.id;
  card.close();
  const leavingSpace = activeTab === "space";
  if (leavingSpace) leaveSpaceMode();
  activeTab = "landmarks";
  places = hits;

  els.tabLandmarks.classList.add("active");
  els.tabWonders.classList.remove("active");
  els.tabContinents.classList.remove("active");
  els.tabCountries.classList.remove("active");
  els.tabSpace.classList.remove("active");
  els.tabLandmarks.setAttribute("aria-selected", "true");
  els.tabWonders.setAttribute("aria-selected", "false");
  els.tabContinents.setAttribute("aria-selected", "false");
  els.tabCountries.setAttribute("aria-selected", "false");
  els.tabSpace.setAttribute("aria-selected", "false");
  els.exploreLabel.textContent = `✨ ${place.name}`;
  els.brandHint.textContent = place.name;
  setPanelOpen(els.settingsPanel, els.settingsBtn, false);
  buildStrip();
  if (globe) {
    globe.setPlaces(places);
    const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
    const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
    globe.pointOfView(lat, lng, 1.65, leavingSpace ? 1100 : 900);
    globe.setAutoRotate(true);
  }
  setAmbientForMode();
  playPop();
}

/* —— Solar system —— */
function bindSpacePick(el, obj) {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    openLandmark(obj.id, el);
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
  const maxPlanetPx = 54;
  const sunMaxPx = 70;

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

function setSizesOpen(open) {
  if (!els.ssSizesPanel) return;
  els.ssSizesPanel.classList.toggle("open", open);
  if (els.ssViewIso) els.ssViewIso.classList.toggle("with-sizes", open);
  if (els.ssSizesToggle) {
    els.ssSizesToggle.setAttribute("aria-expanded", String(open));
    els.ssSizesToggle.setAttribute("aria-label", open ? "Hide planet sizes" : "Show planet sizes");
  }
  if (Solar3D) requestAnimationFrame(() => Solar3D.resize());
}

function toggleSizesPanel() {
  if (!els.ssSizesPanel) return;
  setSizesOpen(!els.ssSizesPanel.classList.contains("open"));
  playPop();
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

function enterSpaceMode() {
  if (spaceTransitioning) return;
  stopFindQuiz();
  spaceTransitioning = true;
  document.body.classList.add("space-mode");
  els.solarSystem.hidden = false;
  if (els.findBtn) els.findBtn.hidden = true;
  if (els.nightBtn) els.nightBtn.style.display = "none";
  if (els.autoNightBtn) els.autoNightBtn.style.display = "none";
  if (els.spaceHandoff) els.spaceHandoff.classList.add("show");
  playFlyWhoosh();
  setAmbientForMode();
  setSizesOpen(true);

  if (globe) {
    globe.setAutoRotate(false);
    globe.setPlaces([]);
    const pov = globe.pointOfView();
    globe.pointOfView(pov.lat || 15, pov.lng || 10, 2.4, 0);
    globe.pointOfView(12, 20, 9.5, 1700);
  }

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
    requestAnimationFrame(() => {
      ensureSolar3D({ introZoom: !reduce }).then(() => {
        if (Solar3D) Solar3D.resize();
      });
    });
    if (els.spaceHandoff) {
      window.setTimeout(() => els.spaceHandoff.classList.remove("show"), reduce ? 0 : 500);
    }
    spaceTransitioning = false;
  }, zoomMs);
}

function leaveSpaceMode() {
  document.body.classList.remove("space-mode");
  els.solarSystem.classList.remove("show");
  if (els.findBtn) els.findBtn.hidden = false;
  if (els.spaceHandoff) els.spaceHandoff.classList.remove("show");
  if (Solar3D) Solar3D.setActive(false);
  els.globeViz.classList.remove("hidden-view");
  if (els.globeShadow) els.globeShadow.classList.remove("hidden-view");
  if (els.nightBtn) els.nightBtn.style.display = "";
  if (els.autoNightBtn) els.autoNightBtn.style.display = "";
  if (globe) {
    globe.setActive(true);
    globe.setNight(nightMode);
  }
  playFlyWhoosh();
  window.setTimeout(() => {
    if (activeTab !== "space") els.solarSystem.hidden = true;
  }, 750);
}

/* —— Find quiz —— */
let findTargetPlace = null;

function hideFindPrompt() {
  if (!els.findPrompt) return;
  els.findPrompt.hidden = true;
  els.findPrompt.classList.remove("found");
  document.body.classList.remove("find-mode");
  if (els.findAgain) els.findAgain.hidden = true;
  if (els.findCue) els.findCue.textContent = "Find this!";
  findTargetPlace = null;
}

function showFindPrompt(target) {
  if (!els.findPrompt || !target) return;
  findTargetPlace = target;
  els.findPrompt.hidden = false;
  els.findPrompt.classList.remove("found");
  document.body.classList.add("find-mode");
  if (els.findCue) els.findCue.textContent = "Find this!";
  if (els.findEmoji) els.findEmoji.textContent = target.emoji || "📍";
  if (els.findAgain) els.findAgain.hidden = true;
  if (els.findPhoto) {
    const src = target.photos && target.photos[0];
    if (src) {
      els.findPhoto.hidden = false;
      els.findPhoto.src = src;
      els.findPhoto.alt = target.name || "";
    } else {
      els.findPhoto.hidden = true;
      els.findPhoto.removeAttribute("src");
    }
  }
}

function markFindFound() {
  if (!els.findPrompt) return;
  els.findPrompt.classList.add("found");
  if (els.findCue) els.findCue.textContent = "You found it!";
  if (els.findAgain) els.findAgain.hidden = false;
}

function speakFindTarget(e) {
  if (e) e.stopPropagation();
  const lm = findTargetPlace || findQuiz.getTarget();
  if (!lm || !lm.name) return;
  sound.ensureAudio();
  speakName(lm);
}

const findQuiz = createFindQuiz({
  onPrompt(target) {
    showFindPrompt(target);
  },
  onCorrect() {
    playChime();
    markFindFound();
  },
  onWrong(_tapped, _target) {
    playBoop();
  },
  onCancel() {
    hideFindPrompt();
  },
});

function startFindQuiz() {
  if (activeTab === "space") return;
  const pool = places.filter((p) => p && p.lat != null && p.lng != null);
  if (pool.length < 2) return;
  card.close();
  findQuiz.cancel();
  const round = findQuiz.start(pool);
  if (!round) return;
  playPop();
  if (globe) globe.setAutoRotate(true);
}

function stopFindQuiz() {
  if (!findQuiz.isActive() && (!els.findPrompt || els.findPrompt.hidden)) return;
  findQuiz.cancel();
  hideFindPrompt();
}

/* —— Globe helpers —— */
function openLandmark(id, sourceEl) {
  let skipFly = false;
  if (findQuiz.isActive()) {
    const result = findQuiz.handlePinTap(id);
    if (result.handled && !result.correct) {
      const pin = document.querySelector(`.pin[data-id="${id}"]`);
      if (pin) {
        pin.classList.remove("pin-wrong");
        void pin.offsetWidth;
        pin.classList.add("pin-wrong");
        pin.addEventListener(
          "animationend",
          () => pin.classList.remove("pin-wrong"),
          { once: true }
        );
      }
      return;
    }
    if (result.handled && result.correct) skipFly = true;
  }

  const lm = places.find((l) => l.id === id);
  if (!lm) return;

  selectedId = id;
  document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
  document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
  const pin = document.querySelector(`.pin[data-id="${id}"]`);
  if (pin) pin.classList.add("selected");
  document.querySelectorAll(SPACE_SEL_BY_ID(id)).forEach((el) => el.classList.add("selected"));
  if (Solar3D) Solar3D.highlight(id);
  syncStrip();

  playPop();
  if (!skipFly) playFlyWhoosh();
  if (sound.isSoundOn()) setAmbientForMode();

  if (activeTab === "space") {
    setTimeout(() => card.openPlaceCard(lm), 220);
    scrollStripToId(id);
    return;
  }

  if (!globe) return;
  globe.setAutoRotate(false);
  if (skipFly) {
    setTimeout(() => card.openPlaceCard(lm), 220);
  } else {
    const alt = activeTab === "countries" ? 1.35 : activeTab === "continents" ? 1.9 : 1.55;
    globe.pointOfView(lm.lat, lm.lng, alt, 1400);
    setTimeout(() => card.openPlaceCard(lm), 900);
  }

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
  if (!DATASETS[tab] || (tab === activeTab && !(tab === "landmarks" && landmarkFilter))) return;
  stopFindQuiz();
  card.close();
  if (tab === "landmarks") landmarkFilter = null;
  const leavingSpace = activeTab === "space";
  const enteringSpace = tab === "space";
  activeTab = tab;
  places = DATASETS[tab].items;

  els.tabLandmarks.classList.toggle("active", tab === "landmarks");
  els.tabWonders.classList.toggle("active", tab === "wonders");
  els.tabContinents.classList.toggle("active", tab === "continents");
  els.tabCountries.classList.toggle("active", tab === "countries");
  els.tabSpace.classList.toggle("active", tab === "space");
  els.tabLandmarks.setAttribute("aria-selected", String(tab === "landmarks"));
  els.tabWonders.setAttribute("aria-selected", String(tab === "wonders"));
  els.tabContinents.setAttribute("aria-selected", String(tab === "continents"));
  els.tabCountries.setAttribute("aria-selected", String(tab === "countries"));
  els.tabSpace.setAttribute("aria-selected", String(tab === "space"));

  els.exploreLabel.textContent = DATASETS[tab].label;
  els.brandHint.textContent = DATASETS[tab].hint;
  setPanelOpen(els.settingsPanel, els.settingsBtn, false);

  buildStrip();

  if (enteringSpace) {
    enterSpaceMode();
  } else {
    if (leavingSpace) leaveSpaceMode();
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
  document.body.classList.toggle("bedtime", nightMode);
  if (els.nightBtn) {
    els.nightBtn.setAttribute("aria-pressed", String(nightMode));
    const icon = document.getElementById("nightIcon");
    if (icon) icon.textContent = nightMode ? "☀️" : "🌙";
  }
  if (globe) globe.setNight(nightMode);
}

function toggleNightMode() {
  autoNight = false;
  syncAutoNightChrome();
  applyNightMode(!nightMode);
  playPop();
}

function syncAutoNightChrome() {
  if (!els.autoNightBtn) return;
  els.autoNightBtn.setAttribute("aria-pressed", String(autoNight));
  if (els.autoNightLabel) {
    els.autoNightLabel.textContent = autoNight ? "Auto night on" : "Auto night off";
  }
}

function applyAutoNightFromClock() {
  if (!autoNight) return;
  applyNightMode(isBedtimeHour());
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
  syncAutoNightChrome();
  applyAutoNightFromClock();
}

/* —— Events —— */
els.surpriseBtn.addEventListener("click", surprise);
if (els.findBtn) {
  els.findBtn.addEventListener("click", () => {
    if (activeTab === "space") return;
    startFindQuiz();
  });
}
if (els.findExit) els.findExit.addEventListener("click", stopFindQuiz);
if (els.findAgain) els.findAgain.addEventListener("click", startFindQuiz);
if (els.findHear) els.findHear.addEventListener("click", speakFindTarget);
if (els.nightBtn) els.nightBtn.addEventListener("click", toggleNightMode);

els.settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = !els.settingsPanel.classList.contains("open");
  setPanelOpen(els.settingsPanel, els.settingsBtn, open);
});
document.addEventListener("click", (e) => {
  if (
    els.settingsPanel.classList.contains("open") &&
    !els.settingsPanel.contains(e.target) &&
    !els.settingsBtn.contains(e.target)
  ) {
    setPanelOpen(els.settingsPanel, els.settingsBtn, false);
  }
});

els.tabLandmarks.addEventListener("click", () => switchTab("landmarks"));
els.tabWonders.addEventListener("click", () => switchTab("wonders"));
els.tabContinents.addEventListener("click", () => switchTab("continents"));
els.tabCountries.addEventListener("click", () => switchTab("countries"));
els.tabSpace.addEventListener("click", () => switchTab("space"));
if (els.ssSizesToggle) els.ssSizesToggle.addEventListener("click", toggleSizesPanel);

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
  els.muteBtn.setAttribute("aria-label", nextOn ? "Sound on" : "Sound off");
  els.muteBtn.title = nextOn ? "Sound on" : "Sound off";
  els.muteIcon.textContent = nextOn ? "🔊" : "🔇";
});

if (els.autoNightBtn) {
  els.autoNightBtn.addEventListener("click", () => {
    autoNight = !autoNight;
    syncAutoNightChrome();
    if (autoNight) applyAutoNightFromClock();
    playPop();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (els.findPrompt && !els.findPrompt.hidden) {
      stopFindQuiz();
      return;
    }
    if (els.settingsPanel.classList.contains("open")) {
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

makeStars();
buildStrip();
buildSizesView();
setSizesOpen(true);
initGlobe();
setInterval(shootingStar, 28000);
setTimeout(shootingStar, 8000);

// Browsers block audio until a gesture — unlock once when sound defaults on
document.addEventListener(
  "pointerdown",
  () => {
    if (!sound.isSoundOn()) return;
    sound.ensureAudio();
    setAmbientForMode();
  },
  { once: true }
);
