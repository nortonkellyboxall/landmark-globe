import { speakCard, speakPhase, stopSpeech } from "./speak.js";
import { createMoonPhaseToy } from "./moon-phases.js";

/** CardMedia — place detail card: gallery, video/anthem, speech. */

const WIKI_PX = /\/(\d+)px-/;

export function cardPhotoUrl(src, width) {
  if (typeof src !== "string" || !src) return src;
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return src;
  if (!src.includes("upload.wikimedia.org")) return src;
  return src.replace(WIKI_PX, `/${Math.round(w)}px-`);
}

/**
 * @param {Record<string, HTMLElement|null>} els card-related DOM elements
 * @param {{
 *   playPop: () => void,
 *   playChime?: () => void,
 *   onClose?: () => void,
 *   onShowPlaces?: (place: object) => void,
 *   placesForContinent?: (continentId: string) => object[],
 * }} deps
 */
export function createCardMedia(els, deps) {
  const playPop = deps.playPop || (() => {});
  const playChime = deps.playChime || (() => {});
  const onClose = deps.onClose || (() => {});
  const onShowPlaces = deps.onShowPlaces || (() => {});
  const placesForContinent = deps.placesForContinent || (() => []);
  const compactMq = window.matchMedia("(max-height: 720px), (max-width: 560px)");

  let photoIndex = 0;
  let photoCount = 0;
  let currentVideoId = null;
  let videoOpen = false;
  let mediaMode = null; // "video" | "anthem" | null
  let currentAnthemUrl = null; // YouTube id OR audio url/path
  let anthemAudio = null;
  let videoFailTimer = null;
  let currentPlace = null;
  let scrollSyncTimer = null;
  let listenersBound = false;
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

  function isCompact() {
    return compactMq.matches;
  }

  function setCardMoreOpen(open) {
    if (!els.cardMore || !els.cardMoreBtn) return;
    els.cardMore.classList.toggle("open", open);
    els.cardMoreBtn.setAttribute("aria-expanded", String(open));
    if (els.card) {
      els.card.classList.toggle("story-open", open && isCompact());
      els.card.classList.toggle("compact-story", isCompact());
    }
  }

  function updatePhotoChrome() {
    if (!els.photoDots || !els.photoPrev || !els.photoNext) return;
    if (photoCount <= 0) {
      els.photoPrev.disabled = true;
      els.photoNext.disabled = true;
      if (els.photoHint) els.photoHint.textContent = "";
      return;
    }
    els.photoDots.querySelectorAll(".photo-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === photoIndex);
    });
    els.photoPrev.disabled = photoIndex <= 0;
    els.photoNext.disabled = photoIndex >= photoCount - 1;
    if (els.photoHint) {
      els.photoHint.textContent =
        photoCount > 1 ? `Photo ${photoIndex + 1} / ${photoCount}` : "Photo";
    }
  }

  function loadPhotoSrc(index) {
    const slide = els.photoTrack.children[index];
    if (!slide) return;
    const img = slide.querySelector("img");
    if (!img || !img.dataset.src) return;
    if (!img.getAttribute("src")) img.src = img.dataset.src;
  }

  function goToPhoto(index, smooth) {
    if (!photoCount) return;
    photoIndex = Math.max(0, Math.min(photoCount - 1, index));
    loadPhotoSrc(photoIndex);
    loadPhotoSrc(photoIndex + 1);
    const slide = els.photoTrack.children[photoIndex];
    if (slide) {
      els.photoTrack.scrollTo({
        left: slide.offsetLeft,
        behavior: smooth === false ? "auto" : "smooth",
      });
    }
    updatePhotoChrome();
  }

  function buildGallery(lm) {
    els.cardHero.style.setProperty("--accent", lm.color === "#ffffff" ? "#c8d6e0" : lm.color);
    destroyMoonToy();
    if (lm.id === "moon") {
      photoCount = 0;
      photoIndex = 0;
      els.photoTrack.innerHTML = "";
      els.photoDots.innerHTML = "";
      if (els.photoCredit) els.photoCredit.hidden = true;
      if (els.photoHint) els.photoHint.hidden = true;
      if (els.card) els.card.classList.add("moon-phase-open");
      moonToy = createMoonPhaseToy(els.photoTrack, {
        onPhaseChange: handlePhaseChange,
      });
      updatePhotoChrome();
      return;
    }

    const photos = (lm.photos && lm.photos.length ? lm.photos : []).slice(0, 6);
    photoCount = photos.length || 1;
    photoIndex = 0;
    els.photoTrack.innerHTML = "";
    els.photoDots.innerHTML = "";

    if (!photos.length) {
      const slide = document.createElement("div");
      slide.className = "photo-slide broken";
      slide.innerHTML = `<div class="photo-fallback">${lm.emoji}</div>`;
      els.photoTrack.appendChild(slide);
    } else {
      photos.forEach((src, i) => {
        const slide = document.createElement("div");
        slide.className = "photo-slide";
        const img = document.createElement("img");
        img.alt = `${lm.name} photo ${i + 1}`;
        img.decoding = "async";
        img.loading = i === 0 ? "eager" : "lazy";
        const url = cardPhotoUrl(src, 640);
        if (i === 0) {
          img.src = url;
        } else {
          img.dataset.src = url;
        }
        img.addEventListener("error", () => slide.classList.add("broken"));
        const fallback = document.createElement("div");
        fallback.className = "photo-fallback";
        fallback.textContent = lm.emoji;
        slide.appendChild(img);
        slide.appendChild(fallback);
        els.photoTrack.appendChild(slide);

        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "photo-dot" + (i === 0 ? " active" : "");
        dot.setAttribute("aria-label", `Photo ${i + 1}`);
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          goToPhoto(i);
          playPop();
        });
        els.photoDots.appendChild(dot);
      });
    }

    const showNav = photoCount > 1;
    els.photoPrev.style.display = showNav ? "flex" : "none";
    els.photoNext.style.display = showNav ? "flex" : "none";
    els.photoDots.style.display = showNav ? "flex" : "none";
    els.photoTrack.scrollLeft = 0;
    loadPhotoSrc(0);
    loadPhotoSrc(1);
    updatePhotoChrome();
  }

  function isAnthemAudioSrc(src) {
    if (!src || typeof src !== "string") return false;
    return (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("anthems/") ||
      /\.(mp3|ogg|oga|wav|m4a|flac)(\?|$)/i.test(src)
    );
  }

  function isYouTubeId(src) {
    return typeof src === "string" && /^[\w-]{11}$/.test(src);
  }

  function stopAnthemAudio() {
    if (anthemAudio) {
      anthemAudio.pause();
      anthemAudio.removeAttribute("src");
      anthemAudio.load();
      anthemAudio = null;
    }
    const wrap = els.videoPanel.querySelector(".anthem-player");
    if (wrap) wrap.remove();
    els.videoPanel.classList.remove("audio-mode");
  }

  function playAnthemAudio(src) {
    els.videoStart.style.display = "none";
    if (els.videoFallback) els.videoFallback.classList.remove("open");
    els.videoPanel.hidden = false;
    els.videoPanel.classList.add("open", "audio-mode");
    els.card.classList.remove("video-open");
    els.videoNote.classList.add("open");
  const spain = /marcha_real|spain/i.test(src);
  els.videoNote.textContent = spain
    ? "Spain’s anthem has no official words — music only"
    : "National anthem · audio player";
    const wrap = document.createElement("div");
    wrap.className = "anthem-player";
    wrap.innerHTML = `
          <div class="anthem-now">
            <span class="pulse" aria-hidden="true">🎵</span>
            <span>Playing the national anthem</span>
          </div>
        `;
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.preload = "auto";
    audio.src = src;
    audio.setAttribute("aria-label", "National anthem");
    wrap.appendChild(audio);
    els.videoPanel.appendChild(wrap);
    anthemAudio = audio;
    audio.play().catch(() => {});
  }

  function stopVideo() {
    clearTimeout(videoFailTimer);
    videoFailTimer = null;
    const iframe = els.videoPanel.querySelector("iframe");
    if (iframe) iframe.remove();
    stopAnthemAudio();
    if (els.videoFallback) els.videoFallback.classList.remove("open");
    els.videoStart.style.display = "flex";
    els.videoPanel.classList.remove("open", "audio-mode");
    els.videoPanel.hidden = true;
    els.videoNote.classList.remove("open");
    els.card.classList.remove("video-open");
    els.watchBtn.setAttribute("aria-pressed", "false");
    els.watchBtn.innerHTML = '<span class="icon">🎬</span> Watch';
    els.anthemBtn.setAttribute("aria-pressed", "false");
    els.anthemBtn.innerHTML = '<span class="icon">🎵</span> Anthem';
    videoOpen = false;
    mediaMode = null;
  }

  function showVideoFallback() {
    if (!els.videoFallback) return;
    els.videoFallback.classList.add("open");
    els.videoNote.textContent =
      mediaMode === "anthem"
        ? "Anthem video blocked here · tap Hear it for the story"
        : "Video blocked or offline · hear the story instead";
    els.videoNote.classList.add("open");
  }

  function playVideoEmbed() {
    const id = mediaMode === "anthem" ? currentAnthemUrl : currentVideoId;
    if (!isYouTubeId(id)) return;
    if (!navigator.onLine) {
      els.videoStart.style.display = "none";
      showVideoFallback();
      return;
    }
    els.videoStart.style.display = "none";
    if (els.videoFallback) els.videoFallback.classList.remove("open");
    const iframe = document.createElement("iframe");
    const origin = encodeURIComponent(window.location.origin || "http://127.0.0.1:8765");
    // youtube.com (not nocookie) embeds more reliably for anthems
    iframe.src =
      "https://www.youtube.com/embed/" +
      id +
      "?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=" +
      origin;
    iframe.title = mediaMode === "anthem" ? "National anthem" : "Learning video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.addEventListener("error", showVideoFallback);
    els.videoPanel.appendChild(iframe);
    clearTimeout(videoFailTimer);
    videoFailTimer = setTimeout(() => {
      if (!els.videoPanel.classList.contains("open")) return;
      if (!iframe.isConnected) return;
      if (!navigator.onLine) {
        showVideoFallback();
        return;
      }
      if (els.videoNote && mediaMode === "anthem") {
        els.videoNote.textContent =
          "If you see “Video unavailable”, that clip blocks embedding — try another country or Hear it";
        els.videoNote.classList.add("open");
      } else if (els.videoNote) {
        els.videoNote.textContent = "If the video won’t play, tap Hear it";
        els.videoNote.classList.add("open");
      }
    }, 4500);
  }

  function clearMediaSurface() {
    stopSpeech();
    const iframe = els.videoPanel.querySelector("iframe");
    if (iframe) iframe.remove();
    stopAnthemAudio();
  }

  function showMediaPanel(mode) {
    if (mode === "anthem") {
      if (!currentAnthemUrl) return;
      clearMediaSurface();

      mediaMode = "anthem";
      videoOpen = true;
      els.watchBtn.setAttribute("aria-pressed", "false");
      els.watchBtn.innerHTML = '<span class="icon">🎬</span> Watch';
      els.anthemBtn.setAttribute("aria-pressed", "true");
      els.anthemBtn.innerHTML = '<span class="icon">🎵</span> Stop';

      if (isAnthemAudioSrc(currentAnthemUrl)) {
        playAnthemAudio(currentAnthemUrl);
      } else if (isYouTubeId(currentAnthemUrl)) {
        els.videoPanel.classList.remove("audio-mode");
        els.videoPanel.hidden = false;
        els.videoPanel.classList.add("open");
        els.card.classList.add("video-open");
        els.videoNote.classList.add("open");
        els.videoNote.textContent = "National anthem · tap play · needs internet";
        els.videoStart.style.setProperty(
          "--poster",
          `url("https://i.ytimg.com/vi/${currentAnthemUrl}/hqdefault.jpg")`
        );
        els.videoStart.querySelector("span:last-child").textContent = "Tap to play anthem";
        els.videoStart.style.display = "flex";
      } else {
        return;
      }

      playPop();
      return;
    }

    const id = currentVideoId;
    if (!id) return;
    clearMediaSurface();

    mediaMode = "video";
    videoOpen = true;
    els.videoPanel.hidden = false;
    els.videoPanel.classList.add("open");
    els.videoPanel.classList.remove("audio-mode");
    els.card.classList.add("video-open");
    els.videoNote.classList.add("open");
    els.videoNote.textContent = "Needs internet · YouTube";

    els.watchBtn.setAttribute("aria-pressed", "true");
    els.watchBtn.innerHTML = '<span class="icon">🎬</span> Hide video';
    els.anthemBtn.setAttribute("aria-pressed", "false");
    els.anthemBtn.innerHTML = '<span class="icon">🎵</span> Anthem';

    els.videoStart.style.setProperty(
      "--poster",
      `url("https://i.ytimg.com/vi/${id}/hqdefault.jpg")`
    );
    els.videoStart.querySelector("span:last-child").textContent = "Tap to watch";
    els.videoStart.style.display = "none";
    playPop();
    playVideoEmbed();
  }

  function toggleVideo() {
    if (videoOpen && mediaMode === "video") {
      stopVideo();
    } else {
      showMediaPanel("video");
    }
  }

  function toggleAnthem() {
    if (videoOpen && mediaMode === "anthem") {
      stopVideo();
    } else {
      showMediaPanel("anthem");
    }
  }

  function openPlaceCard(place) {
    currentPlace = place;
    stopVideo();
    buildGallery(place);
    currentVideoId = place.video || null;
    currentAnthemUrl = place.anthem || null;
    els.watchBtn.hidden = !currentVideoId;
    els.anthemBtn.hidden = !currentAnthemUrl;
    const placeHits =
      place.kind === "continent" ? placesForContinent(place.id) : [];
    if (els.showPlacesBtn) {
      els.showPlacesBtn.hidden = placeHits.length === 0;
    }
    // "More" only reveals the story on compact screens
    els.cardMoreBtn.hidden = !isCompact();
    setCardMoreOpen(false);
    els.cardTitle.textContent = place.name;
    els.cardPlace.textContent = place.place;
    els.cardStory.textContent = place.story;
    els.cardWow.textContent = place.wow;
    els.overlay.hidden = false;
    els.card.hidden = false;
    requestAnimationFrame(() => {
      els.overlay.classList.add("open");
      els.card.classList.add("open");
      if (els.card) els.card.classList.toggle("compact-story", isCompact());
    });
    playChime();
  }

  function close() {
    stopSpeech();
    destroyMoonToy();
    stopVideo();
    setCardMoreOpen(false);
    els.overlay.classList.remove("open");
    els.card.classList.remove("open");
    setTimeout(() => {
      if (!els.card.classList.contains("open")) {
        els.overlay.hidden = true;
        els.card.hidden = true;
      }
    }, 400);
    currentPlace = null;
    currentVideoId = null;
    currentAnthemUrl = null;
    onClose();
  }

  function speak(place) {
    const lm = place || currentPlace;
    if (!lm) return;
    speakCard(lm);
  }

  /** Stop media if open, else close card. Returns true if something was dismissed. */
  function tryDismiss() {
    if (videoOpen) {
      stopVideo();
      return true;
    }
    if (els.card.classList.contains("open")) {
      close();
      return true;
    }
    return false;
  }

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;

    els.overlay.addEventListener("click", close);
    els.cardClose.addEventListener("click", () => {
      if (videoOpen) {
        stopVideo();
        return;
      }
      close();
    });
    els.speakBtn.addEventListener("click", () => speak());
    els.watchBtn.addEventListener("click", toggleVideo);
    els.anthemBtn.addEventListener("click", toggleAnthem);
    if (els.showPlacesBtn) {
      els.showPlacesBtn.addEventListener("click", () => {
        if (currentPlace) onShowPlaces(currentPlace);
      });
    }
    els.cardMoreBtn.addEventListener("click", () => {
      setCardMoreOpen(!els.cardMore.classList.contains("open"));
    });
    els.videoStart.addEventListener("click", playVideoEmbed);
    if (els.videoFallbackHear) {
      els.videoFallbackHear.addEventListener("click", () => {
        stopVideo();
        speak();
      });
    }

    els.photoPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      goToPhoto(photoIndex - 1);
      playPop();
    });
    els.photoNext.addEventListener("click", (e) => {
      e.stopPropagation();
      goToPhoto(photoIndex + 1);
      playPop();
    });

    els.photoTrack.addEventListener(
      "scroll",
      () => {
        clearTimeout(scrollSyncTimer);
        scrollSyncTimer = setTimeout(() => {
          const w = els.photoTrack.clientWidth || 1;
          const idx = Math.round(els.photoTrack.scrollLeft / w);
          if (idx !== photoIndex) {
            photoIndex = Math.max(0, Math.min(photoCount - 1, idx));
            loadPhotoSrc(photoIndex);
            loadPhotoSrc(photoIndex + 1);
            updatePhotoChrome();
          }
        }, 60);
      },
      { passive: true }
    );

    // Keep swipe gestures on the gallery from bubbling oddly on touch devices
    els.cardHero.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("keydown", (e) => {
      const cardOpen = els.card.classList.contains("open");
      if (cardOpen && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        goToPhoto(photoIndex + (e.key === "ArrowRight" ? 1 : -1));
      }
    });
  }

  bindListeners();

  return {
    openPlaceCard,
    close,
    tryDismiss,
  };
}
