import {
  SPACE_BODIES,
  diameterKm as spaceDiameterKm,
} from "./space-catalog.js";
import { createCardMedia } from "./card-media.js";
import { createGlobe } from "./globe-app.js";
import { diveMs, heatHint, isDeepSpace } from "./orbit-look.js";
import { weatherForPlace } from "./place-weather.js";
import { createSound } from "./sound.js";
import { createFindGame } from "./find-game.js";
import { createFindProgress } from "./find-progress.js";
import { createSpaceMode } from "./space-mode.js";
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
const sound = createSound();
const progress = createFindProgress();

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
  foundFlash: document.getElementById("foundFlash"),
  spaceHandoff: document.getElementById("spaceHandoff"),
  nightBtn: document.getElementById("nightBtn"),
  sunBtn: document.getElementById("sunBtn"),
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
  findStars: document.getElementById("findStars"),
  findEmoji: document.getElementById("findEmoji"),
  findPhoto: document.getElementById("findPhoto"),
  findHear: document.getElementById("findHear"),
  findAgain: document.getElementById("findAgain"),
  stickersBtn: document.getElementById("stickersBtn"),
  stickerCount: document.getElementById("stickerCount"),
  stickerSheet: document.getElementById("stickerSheet"),
  stickerGrid: document.getElementById("stickerGrid"),
  stickerClose: document.getElementById("stickerClose"),
  luna: document.getElementById("luna"),
  lunaBubble: document.getElementById("lunaBubble"),
  fireflies: document.getElementById("fireflies"),
  speakBtn: document.getElementById("speakBtn"),
};

function setPanelOpen(panel, btn, open) {
  if (!panel || !btn) return;
  panel.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", String(open));
}

/* —— Stars —— */
function makeStars() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 95; i++) {
    const s = document.createElement("span");
    s.className = "star" + (i % 7 === 0 ? " big" : "") + (i % 11 === 0 ? " flare" : "");
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

function startFireflies() {
  const canvas = els.fireflies;
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  const bugs = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00045,
    vy: (Math.random() - 0.5) * 0.00035,
    r: 1.2 + Math.random() * 2.2,
    phase: Math.random() * Math.PI * 2,
  }));

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bugs.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.phase += 0.04;
      if (b.x < 0 || b.x > 1) b.vx *= -1;
      if (b.y < 0 || b.y > 1) b.vy *= -1;
      const glow = 0.35 + Math.abs(Math.sin(b.phase)) * 0.65;
      const x = b.x * canvas.width;
      const y = b.y * canvas.height;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 220, 110, ${glow})`;
      ctx.shadowColor = "rgba(255, 180, 60, 0.9)";
      ctx.shadowBlur = 12;
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
}

function setAmbientForMode() {
  sound.setAmbientForMode({ activeTab, selectedId });
}
const { playPop, playChime, playFanfare, playBoop, playFlyWhoosh } = sound;

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

function sparkBurst(x, y) {
  sparkAt(x, y);
  sparkAt(x, y);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 8; i++) {
    const sp = document.createElement("span");
    sp.className = "spark-emoji";
    sp.textContent = i % 2 ? "✨" : "⭐";
    const angle = (Math.PI * 2 * i) / 8 + 0.2;
    const dist = 36 + Math.random() * 48;
    sp.style.left = x + "px";
    sp.style.top = y + "px";
    sp.style.setProperty("--sx", Math.cos(angle) * dist + "px");
    sp.style.setProperty("--sy", Math.sin(angle) * dist + "px");
    els.sparkles.appendChild(sp);
    setTimeout(() => sp.remove(), 900);
  }
}

function setLunaMood(mood, bubble) {
  if (!els.luna) return;
  els.luna.dataset.mood = mood || "idle";
  if (!els.lunaBubble) return;
  if (!bubble) {
    els.lunaBubble.hidden = true;
    return;
  }
  els.lunaBubble.hidden = false;
  els.lunaBubble.textContent = bubble;
}

function flashFound() {
  if (!els.foundFlash) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  els.foundFlash.classList.remove("go");
  void els.foundFlash.offsetWidth;
  els.foundFlash.classList.add("go");
  els.foundFlash.addEventListener(
    "animationend",
    () => els.foundFlash.classList.remove("go"),
    { once: true }
  );
}

/* —— Strip —— */
function buildStrip() {
  els.strip.innerHTML = "";
  places.forEach((lm) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb" + (progress.isFound(lm.id) ? " found" : "");
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
    t.classList.toggle("found", progress.isFound(t.dataset.id));
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
    if (globe) globe.setWeather();
    if (!findGame.isActive()) setLunaMood("idle", "🌙");
    if (activeTab !== "space" && globe) globe.setAutoRotate(true);
    findGame.onCardClose();
  },
});

function placeById(id) {
  for (const key of Object.keys(DATASETS)) {
    const hit = DATASETS[key].items.find((p) => p.id === id);
    if (hit) return hit;
  }
  return null;
}

const findGame = createFindGame({
  els,
  getTab: () => activeTab,
  getPlaces: () => places,
  lookupPlace: placeById,
  getGlobe: () => globe,
  card,
  progress,
  diveMs,
  isDeepSpace,
  heatHint,
  playPop,
  playFanfare,
  playBoop,
  playFlyWhoosh,
  ensureAudio: () => sound.ensureAudio(),
  speakName,
  setLunaMood,
  sparkBurst,
  shootingStar,
  flashFound,
  onOpenPlace: (id) => openLandmark(id),
});

const spaceMode = createSpaceMode({
  els,
  getGlobe: () => globe,
  getTab: () => activeTab,
  getNightMode: () => nightMode,
  getSpaceItems: () => DATASETS.space.items,
  spaceDiameterKm,
  diveMs,
  playFlyWhoosh,
  setAmbient: setAmbientForMode,
  sparkAt,
  onSelect: (id) => openLandmark(id),
  stopFind: () => findGame.stop(),
  matchReduce: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});

function showPlacesInContinent(place) {
  const hits = placesForContinent(place.id);
  if (!hits.length) return;
  findGame.stop();
  landmarkFilter = place.id;
  card.close();
  const leavingSpace = activeTab === "space";
  if (leavingSpace) spaceMode.leave();
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

/* —— Globe helpers —— */
function openLandmark(id, sourceEl) {
  let skipFly = false;
  const result = findGame.handlePinTap(id);
  if (result.handled && !result.correct) return;
  if (result.handled && result.correct) skipFly = true;

  if (id === "iss") {
    playPop();
    setLunaMood("cheer", "🛰️");
    return;
  }

  const lm = places.find((l) => l.id === id);
  if (!lm) return;

  selectedId = id;
  document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
  document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
  const pin = document.querySelector(`.pin[data-id="${id}"]`);
  if (pin) pin.classList.add("selected");
  document.querySelectorAll(SPACE_SEL_BY_ID(id)).forEach((el) => el.classList.add("selected"));
  spaceMode.highlight(id);
  syncStrip();

  playPop();
  if (!skipFly) playFlyWhoosh();
  if (sound.isSoundOn()) setAmbientForMode();
  if (!skipFly && sound.isSoundOn() && lm.name) {
    sound.ensureAudio();
    speakName(lm);
    setLunaMood("hunt", lm.emoji || "🌍");
  }

  if (activeTab === "space") {
    setTimeout(() => card.openPlaceCard(lm), 220);
    scrollStripToId(id);
    return;
  }

  if (!globe) return;
  globe.setAutoRotate(false);
  globe.setWeather(lm.lat, lm.lng, weatherForPlace(lm));
  if (skipFly) {
    setTimeout(() => card.openPlaceCard(lm), 220);
  } else {
    const alt = activeTab === "countries" ? 1.35 : activeTab === "continents" ? 1.9 : 1.55;
    const from = (globe.pointOfView() || {}).altitude;
    const ms = diveMs(from, alt);
    globe.pointOfView(lm.lat, lm.lng, alt, ms);
    setTimeout(() => card.openPlaceCard(lm), Math.min(ms - 180, Math.max(420, ms * 0.62)));
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
  const rect = els.globeViz ? els.globeViz.getBoundingClientRect() : null;
  if (rect) sparkBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
  findGame.hideStickers();
  findGame.stop();
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

  const views = {
    landmarks: [20, 20, 2.2],
    wonders: [10, 30, 2.25],
    continents: [15, 20, 2.35],
    countries: [18, 12, 1.85],
  };

  function showEarthPins() {
    if (!globe || activeTab === "space") return;
    const pinData =
      activeTab === "countries" || activeTab === "continents" ? staggerPinPlaces(places) : places;
    globe.setPlaces(pinData);
    const v = views[activeTab] || views.landmarks;
    const from = (globe.pointOfView() || {}).altitude;
    globe.pointOfView(v[0], v[1], v[2], leavingSpace ? diveMs(from, v[2]) : 900);
    globe.setAutoRotate(true);
    setAmbientForMode();
  }

  if (enteringSpace) {
    spaceMode.enter();
  } else if (leavingSpace) {
    Promise.resolve(spaceMode.leave()).then(showEarthPins);
  } else {
    showEarthPins();
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
function syncOrbitChrome(pov) {
  const alt = pov && pov.altitude;
  document.body.classList.toggle("deep-space", isDeepSpace(alt));
  findGame.syncHeat(pov);
  if (spaceMode.shouldHandoff(alt)) switchTab("space");
}

function markGlobeReady() {
  if (globeReady) return;
  globeReady = true;
  els.loader.classList.add("hide");
  if (!globe || activeTab === "space") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sky = globe.skyShowLook ? globe.skyShowLook() : { lat: 18, lng: -18, altitude: 2.45 };
  globe.pointOfView(sky.lat, sky.lng, sky.altitude, reduce ? 0 : 4800);
  window.setTimeout(() => {
    spaceMode.armPinch();
  }, reduce ? 400 : 5200);
  spaceMode.ensure().catch(() => {});
}

function initGlobe() {
  globe = createGlobe(els.globeViz, {
    places,
    onSelect: (id) => openLandmark(id),
    sparkAt,
    onReady: markGlobeReady,
    onPov: syncOrbitChrome,
    hasSelection: () => !!selectedId,
    isFound: (id) => progress.isFound(id),
  });
  document.body.classList.add("deep-space");
  syncAutoNightChrome();
  applyAutoNightFromClock();
}

/* —— Events —— */
els.surpriseBtn.addEventListener("click", surprise);
if (els.findBtn) {
  els.findBtn.addEventListener("click", () => {
    findGame.start();
  });
}
if (els.findExit) els.findExit.addEventListener("click", () => findGame.stop());
if (els.findAgain) els.findAgain.addEventListener("click", () => findGame.start());
if (els.findHear) els.findHear.addEventListener("click", (e) => findGame.speakTarget(e));
if (els.luna) {
  els.luna.addEventListener("click", () => {
    if (findGame.isActive()) {
      findGame.speakTarget();
      return;
    }
    findGame.start();
  });
}
if (els.stickersBtn) {
  els.stickersBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (els.stickerSheet && !els.stickerSheet.hidden) findGame.hideStickers();
    else findGame.showStickers();
    playPop();
  });
}
if (els.stickerClose) els.stickerClose.addEventListener("click", () => findGame.hideStickers());
document.addEventListener("pointerdown", (e) => {
  if (!els.stickerSheet || els.stickerSheet.hidden) return;
  const t = e.target;
  if (!(t instanceof Node)) return;
  if (els.stickerSheet.contains(t) || (els.stickersBtn && els.stickersBtn.contains(t))) return;
  findGame.hideStickers();
});
if (els.nightBtn) els.nightBtn.addEventListener("click", toggleNightMode);

if (els.sunBtn) {
  let sunHours = 0;
  let sunDrag = null;
  els.sunBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    els.sunBtn.setPointerCapture(e.pointerId);
    sunDrag = { x: e.clientX, hours: sunHours, moved: false };
  });
  els.sunBtn.addEventListener("pointermove", (e) => {
    if (!sunDrag || !globe) return;
    const dx = e.clientX - sunDrag.x;
    if (Math.abs(dx) > 6) sunDrag.moved = true;
    sunHours = sunDrag.hours + dx / 28;
    globe.setSunHours(sunHours);
    els.sunBtn.classList.toggle("tugged", Math.abs(sunHours) > 0.2);
  });
  els.sunBtn.addEventListener("pointerup", () => {
    if (!globe) return;
    if (!sunDrag || !sunDrag.moved) {
      sunHours = 0;
      globe.setSunHours(0);
    }
    els.sunBtn.classList.toggle("tugged", Math.abs(sunHours) > 0.2);
    sunDrag = null;
    playPop();
  });
}

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
if (els.ssSizesToggle) {
  els.ssSizesToggle.addEventListener("click", () => {
    spaceMode.toggleSizes();
    playPop();
  });
}

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
    if (els.stickerSheet && !els.stickerSheet.hidden) {
      findGame.hideStickers();
      return;
    }
    if (els.findPrompt && !els.findPrompt.hidden) {
      findGame.stop();
      return;
    }
    if (els.settingsPanel.classList.contains("open")) {
      setPanelOpen(els.settingsPanel, els.settingsBtn, false);
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
startFireflies();
setLunaMood("idle", "🌙");
buildStrip();
spaceMode.buildSizes();
spaceMode.setSizesOpen(true);
initGlobe();
findGame.syncChrome();
setInterval(shootingStar, 16000);
setTimeout(shootingStar, 5000);

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
