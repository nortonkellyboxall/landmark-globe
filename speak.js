/** Pre-baked Luna MP3 clips (vendor/tts/clips) — HTMLAudio for phone/Safari. */

const CLIPS_BASE = new URL("./vendor/tts/clips/", import.meta.url);

let speakGen = 0;
/** @type {HTMLAudioElement|null} */
let currentAudio = null;

/** Stop playback. */
export function stopSpeech() {
  speakGen += 1;
  if (!currentAudio) return;
  try {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
  } catch {
    /* ignore */
  }
  currentAudio = null;
}

/**
 * @param {string} id
 * @param {"card"|"name"} kind
 */
function clipUrl(id, kind) {
  return new URL(`${encodeURIComponent(id)}.${kind}.mp3`, CLIPS_BASE).href;
}

/**
 * @param {string} url
 */
function playUrl(url) {
  const my = ++speakGen;
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }

  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };
  audio.onerror = () => {
    console.warn("[speak] failed to play", url);
    if (currentAudio === audio) currentAudio = null;
  };

  const play = audio.play();
  if (play && typeof play.catch === "function") {
    play.catch((err) => {
      if (my !== speakGen) return;
      console.warn("[speak]", err);
    });
  }
}

/**
 * Play the full place card narration (pre-baked).
 * @param {{ id: string }} place
 */
export function speakCard(place) {
  if (!place?.id) return;
  playUrl(clipUrl(place.id, "card"));
}

/**
 * Play just the place name (Find quiz, etc.).
 * @param {{ id: string }} place
 */
export function speakName(place) {
  if (!place?.id) return;
  playUrl(clipUrl(place.id, "name"));
}

/**
 * Play a moon-phase name clip (pre-baked).
 * @param {string} phaseId e.g. "full"
 */
export function speakPhase(phaseId) {
  if (!phaseId) return;
  playUrl(clipUrl(`phase-${phaseId}`, "name"));
}
