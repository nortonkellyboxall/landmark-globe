import {
  SPACE_BODIES,
  diameterKm as spaceDiameterKm,
} from "./space-catalog.js";
import { createCardMedia } from "./card-media.js";
import { createGlobe } from "./globe-app.js";
import { diveMs, heatHint, isDeepSpace } from "./orbit-look.js";
import { weatherForPlace } from "./place-weather.js";
import { ambientKind, createSound } from "./sound.js";
import { createAdventure, placesForContinent as continentPlaces } from "./adventure.js";
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

let adventure;
let globe = null;
let nightMode = false;
let autoNight = true;
let globeReady = false;
const sound = createSound();
const progress = createFindProgress();

function isBedtimeHour(date = new Date()) {
  const h = date.getHours();
  return h >= 19 || h < 6;
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
  sound.setAmbientForMode(ambientKind(adventure.getTab(), adventure.getSelectedId()));
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

/* —— CardMedia —— */
const card = createCardMedia(els, {
  playPop,
  playChime,
  placesForContinent: (id) =>
    continentPlaces(id, DATASETS.landmarks.items, DATASETS.wonders.items),
  onShowPlaces(place) {
    adventure.showPlacesInContinent(place);
  },
  onClose() {
    adventure.setSelectedId(null);
    document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
    document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
    adventure.syncStrip();
    if (globe) globe.setWeather();
    if (!findGame.isActive()) setLunaMood("idle", "🌙");
    if (adventure.getTab() !== "space" && globe) globe.setAutoRotate(true);
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
  getTab: () => adventure.getTab(),
  getPlaces: () => adventure.getPlaces(),
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
  getTab: () => adventure.getTab(),
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

adventure = createAdventure({
  datasets: DATASETS,
  els,
  getGlobe: () => globe,
  card,
  stopFind: () => findGame.stop(),
  spaceEnter: () => spaceMode.enter(),
  spaceLeave: () => spaceMode.leave(),
  diveMs,
  setAmbient: setAmbientForMode,
  playPop,
  setPanelOpen,
  onOpenPlace: (id, el) => openLandmark(id, el),
  hideStickers: () => findGame.hideStickers(),
  isFound: (id) => progress.isFound(id),
});

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

  const lm = adventure.getPlaces().find((l) => l.id === id);
  if (!lm) return;

  adventure.setSelectedId(id);
  document.querySelectorAll(".pin.selected").forEach((p) => p.classList.remove("selected"));
  document.querySelectorAll(SPACE_SEL).forEach((p) => p.classList.remove("selected"));
  const pin = document.querySelector(`.pin[data-id="${id}"]`);
  if (pin) pin.classList.add("selected");
  document.querySelectorAll(SPACE_SEL_BY_ID(id)).forEach((el) => el.classList.add("selected"));
  spaceMode.highlight(id);
  adventure.syncStrip();

  playPop();
  if (!skipFly) playFlyWhoosh();
  if (sound.isSoundOn()) setAmbientForMode();
  if (!skipFly && sound.isSoundOn() && lm.name) {
    sound.ensureAudio();
    speakName(lm);
    setLunaMood("hunt", lm.emoji || "🌍");
  }

  if (adventure.getTab() === "space") {
    setTimeout(() => card.openPlaceCard(lm), 220);
    adventure.scrollStripToId(id);
    return;
  }

  if (!globe) return;
  globe.setAutoRotate(false);
  globe.setWeather(lm.lat, lm.lng, weatherForPlace(lm));
  if (skipFly) {
    setTimeout(() => card.openPlaceCard(lm), 220);
  } else {
    const tab = adventure.getTab();
    const alt = tab === "countries" ? 1.35 : tab === "continents" ? 1.9 : 1.55;
    const from = (globe.pointOfView() || {}).altitude;
    const ms = diveMs(from, alt);
    globe.pointOfView(lm.lat, lm.lng, alt, ms);
    setTimeout(() => card.openPlaceCard(lm), Math.min(ms - 180, Math.max(420, ms * 0.62)));
  }

  adventure.scrollStripToId(id);
}

function randomLandmark(excludeId) {
  const pool = adventure.getPlaces().filter((l) => l.id !== excludeId);
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
  const next = randomLandmark(adventure.getSelectedId());
  if (next) openLandmark(next.id);
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
  if (spaceMode.shouldHandoff(alt)) adventure.switchTab("space");
}

function markGlobeReady() {
  if (globeReady) return;
  globeReady = true;
  els.loader.classList.add("hide");
  if (!globe || adventure.getTab() === "space") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sky = globe.skyShowLook ? globe.skyShowLook() : { lat: 18, lng: -18, altitude: 2.45 };
  globe.pointOfView(sky.lat, sky.lng, sky.altitude, reduce ? 0 : 4800);
  window.setTimeout(() => {
    spaceMode.armPinch();
  }, reduce ? 400 : 5200);
  spaceMode.preload();
}

function initGlobe() {
  globe = createGlobe(els.globeViz, {
    places: adventure.getPlaces(),
    onSelect: (id) => openLandmark(id),
    sparkAt,
    onReady: markGlobeReady,
    onPov: syncOrbitChrome,
    hasSelection: () => !!adventure.getSelectedId(),
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

els.tabLandmarks.addEventListener("click", () => adventure.switchTab("landmarks"));
els.tabWonders.addEventListener("click", () => adventure.switchTab("wonders"));
els.tabContinents.addEventListener("click", () => adventure.switchTab("continents"));
els.tabCountries.addEventListener("click", () => adventure.switchTab("countries"));
els.tabSpace.addEventListener("click", () => adventure.switchTab("space"));
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
adventure.buildStrip();
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
