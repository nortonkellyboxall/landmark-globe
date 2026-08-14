/** Find quiz module — prompt, stickers, heat, and card-resume. Round rules stay in quiz.js. */

import { createFindQuiz, findPool } from "./quiz.js";
import { STAR_CAP } from "./find-progress.js";

function queryAll(sel) {
  const doc = typeof globalThis.document !== "undefined" ? globalThis.document : undefined;
  if (!doc || typeof doc.querySelectorAll !== "function") return [];
  return doc.querySelectorAll(sel);
}

function docBody() {
  const doc = typeof globalThis.document !== "undefined" ? globalThis.document : undefined;
  return doc && doc.body;
}

function makeEl(tag) {
  const doc = typeof globalThis.document !== "undefined" ? globalThis.document : undefined;
  if (!doc || typeof doc.createElement !== "function") return null;
  return doc.createElement(tag);
}

/**
 * @param {{
 *   els: Record<string, object|null>,
 *   getTab: () => string,
 *   getPlaces: () => object[],
 *   lookupPlace: (id: string) => object|null,
 *   getGlobe: () => object|null,
 *   card: { close: () => void },
 *   progress: object,
 *   diveMs: (fromAlt?: number, toAlt?: number) => number,
 *   isDeepSpace: (alt?: number) => boolean,
 *   heatHint: (fromLat: number, fromLng: number, toLat: number, toLng: number) => string,
 *   playPop: () => void,
 *   playFanfare: () => void,
 *   playBoop: () => void,
 *   playFlyWhoosh?: () => void,
 *   ensureAudio: () => void,
 *   speakName: (place: object) => void,
 *   setLunaMood: (mood: string, emoji?: string) => void,
 *   sparkBurst: (x: number, y: number) => void,
 *   shootingStar: () => void,
 *   flashFound: () => void,
 *   onOpenPlace: (id: string) => void,
 * }} opts
 */
export function createFindGame(opts) {
  const els = opts.els;
  const progress = opts.progress;
  let lastHeat = "";
  let resumeAfterCard = false;
  let lastPrompted = null;

  function syncFindStars() {
    if (!els.findStars) return;
    const n = progress.starsShown();
    els.findStars.innerHTML = "";
    if (typeof els.findStars.appendChild === "function") {
      for (let i = 0; i < STAR_CAP; i++) {
        const star = makeEl("span");
        if (!star) break;
        star.className = "find-star" + (i < n ? " on" : "");
        star.textContent = "⭐";
        els.findStars.appendChild(star);
      }
    }
    els.findStars.classList.toggle("hot", progress.hotStreak());
  }

  function syncStickersBtn() {
    if (!els.stickersBtn) return;
    const n = progress.foundCount();
    els.stickersBtn.hidden = n === 0;
    if (els.stickerCount) els.stickerCount.textContent = n > 99 ? "★" : String(n);
  }

  function syncChrome() {
    syncFindStars();
    syncStickersBtn();
  }

  function stampFound(id) {
    queryAll(`.pin[data-id="${id}"]`).forEach((pin) => {
      pin.classList.add("found");
    });
    queryAll(`.thumb[data-id="${id}"]`).forEach((thumb) => {
      thumb.classList.add("found");
    });
  }

  function hideStickers() {
    if (!els.stickerSheet) return;
    els.stickerSheet.hidden = true;
  }

  function showStickers() {
    if (!els.stickerSheet || !els.stickerGrid) return;
    els.stickerGrid.innerHTML = "";
    if (typeof els.stickerGrid.appendChild === "function") {
      progress.foundIds().forEach((id) => {
        const place = opts.lookupPlace(id);
        const btn = makeEl("button");
        if (!btn) return;
        btn.type = "button";
        btn.className = "sticker";
        btn.dataset.id = id;
        btn.textContent = (place && place.emoji) || "📍";
        btn.setAttribute("aria-label", (place && place.name) || "Sticker");
        btn.addEventListener("click", () => handleStickerTap(id));
        els.stickerGrid.appendChild(btn);
      });
    }
    els.stickerSheet.hidden = false;
  }

  function handleStickerTap(id) {
    const place = opts.lookupPlace(id);
    if (!place) return;
    if (quiz.isActive()) {
      if (place.name) {
        opts.ensureAudio();
        opts.speakName(place);
      }
      return;
    }
    hideStickers();
    if (opts.getPlaces().some((p) => p.id === id)) opts.onOpenPlace(id);
    else if (place.name) {
      opts.ensureAudio();
      opts.speakName(place);
    }
  }

  function hideFindPrompt() {
    if (!els.findPrompt) return;
    els.findPrompt.hidden = true;
    els.findPrompt.classList.remove("found");
    const body = docBody();
    if (body && body.classList) body.classList.remove("find-mode");
    if (els.findAgain) els.findAgain.hidden = true;
    if (els.findCue) els.findCue.textContent = "Find this!";
    lastPrompted = null;
    lastHeat = "";
    opts.setLunaMood("idle");
    const globe = opts.getGlobe();
    if (globe) globe.lockRadar();
  }

  function showFindPrompt(target) {
    if (!els.findPrompt || !target) return;
    lastPrompted = target;
    els.findPrompt.hidden = false;
    els.findPrompt.classList.remove("found");
    const body = docBody();
    if (body && body.classList) body.classList.add("find-mode");
    if (els.findCue) els.findCue.textContent = "Find this!";
    if (els.findEmoji) els.findEmoji.textContent = target.emoji || "📍";
    if (els.findAgain) els.findAgain.hidden = true;
    syncFindStars();
    lastHeat = "";
    opts.setLunaMood("hunt", "🔎");
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
    opts.setLunaMood("cheer", "🎉");
  }

  function speakTarget(e) {
    if (e) e.stopPropagation();
    const lm = quiz.getTarget() || lastPrompted;
    if (!lm || !lm.name) return;
    opts.ensureAudio();
    opts.speakName(lm);
  }

  function burstFrom(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();
    opts.sparkBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function markPinWrong(id) {
    queryAll(`.pin[data-id="${id}"], .ss-size-item[data-id="${id}"]`).forEach((pin) => {
      pin.classList.remove("pin-wrong");
      void pin.offsetWidth;
      pin.classList.add("pin-wrong");
      if (typeof pin.addEventListener === "function") {
        pin.addEventListener(
          "animationend",
          () => pin.classList.remove("pin-wrong"),
          { once: true }
        );
      }
    });
  }

  const quiz = createFindQuiz({
    onPrompt(target) {
      showFindPrompt(target);
    },
    onCorrect(found) {
      opts.playFanfare();
      progress.recordFind(found.id);
      stampFound(found.id);
      syncFindStars();
      syncStickersBtn();
      markFindFound();
      resumeAfterCard = true;
      opts.flashFound();
      const globe = opts.getGlobe();
      if (globe) {
        globe.lockRadar();
        globe.punch();
      }
      burstFrom(queryAll(`.pin[data-id="${found.id}"]`)[0]);
      burstFrom(els.luna);
    },
    onWrong() {
      opts.playBoop();
      opts.setLunaMood("oops", "🙈");
      setTimeout(() => {
        if (quiz.isActive()) opts.setLunaMood("hunt", "🔎");
      }, 500);
    },
    onCancel() {
      hideFindPrompt();
    },
  });

  function start() {
    resumeAfterCard = false;
    hideStickers();
    const pool = findPool(opts.getTab(), opts.getPlaces());
    if (pool.length < 2) return;
    if (els.card && els.card.classList.contains("open")) opts.card.close();
    quiz.cancel();
    const round = quiz.start(pool, {
      pickTarget: (list) => progress.pickTarget(list),
    });
    if (!round) return;
    opts.playPop();
    syncFindStars();
    opts.shootingStar();
    const globe = opts.getGlobe();
    if (globe && opts.getTab() !== "space") {
      globe.setAutoRotate(true);
      if (round.target && round.target.lat != null) {
        globe.lockRadar(round.target.lat, round.target.lng);
      }
      const pov = globe.pointOfView() || {};
      if (opts.isDeepSpace(pov.altitude)) {
        globe.pointOfView(pov.lat || 20, pov.lng || 20, 2.35, opts.diveMs(pov.altitude, 2.35));
      }
    }
  }

  function stop() {
    resumeAfterCard = false;
    progress.resetSession();
    syncFindStars();
    if (!quiz.isActive() && (!els.findPrompt || els.findPrompt.hidden)) return;
    quiz.cancel();
    hideFindPrompt();
  }

  /** @param {string} id */
  function handlePinTap(id) {
    if (!quiz.isActive()) return { handled: false };
    const result = quiz.handlePinTap(id);
    if (result.handled && !result.correct) {
      markPinWrong(id);
      return { handled: true, correct: false };
    }
    if (result.handled && result.correct) {
      return { handled: true, correct: true, skipFly: true };
    }
    return { handled: false };
  }

  function onCardClose() {
    if (!resumeAfterCard) return;
    resumeAfterCard = false;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => start());
      return;
    }
    start();
  }

  /** @param {{ lat?: number, lng?: number }} pov */
  function syncHeat(pov) {
    const target = quiz.getTarget();
    if (!quiz.isActive() || !target || !pov) return;
    if (els.luna && els.luna.dataset.mood === "oops") return;
    if (target.lat == null) return;
    const hint = opts.heatHint(pov.lat, pov.lng, target.lat, target.lng);
    if (hint === lastHeat) return;
    lastHeat = hint;
    const bubble = hint === "hot" ? "🔥" : hint === "warm" ? "🌤️" : "❄️";
    opts.setLunaMood("hunt", bubble);
  }

  return {
    start,
    stop,
    handlePinTap,
    onCardClose,
    syncHeat,
    isActive: () => quiz.isActive(),
    getTarget: () => quiz.getTarget(),
    showStickers,
    hideStickers,
    handleStickerTap,
    syncChrome,
    stampFound,
    speakTarget,
  };
}
