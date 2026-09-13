/** Pre-baked Luna MP3 clips (vendor/tts/clips) — HTMLAudio for phone/Safari. */

const CLIPS_BASE = new URL("./vendor/tts/clips/", import.meta.url);

let speakGen = 0;
let speechMuted = false;
/** @type {HTMLAudioElement|null} */
let currentAudio = null;

/** Mute gate shared with Sound mute (pads + speech + card media). */
export function setSpeechMuted(muted) {
  speechMuted = !!muted;
  if (speechMuted) stopSpeech();
}

export function isSpeechMuted() {
  return speechMuted;
}

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
 * @param {number} gen
 * @param {(() => void) | undefined} onEnded
 */
function playUrlForGen(url, gen, onEnded) {
  if (speechMuted || gen !== speakGen) return;
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
    if (gen === speakGen && typeof onEnded === "function") onEnded();
  };
  audio.onerror = () => {
    console.warn("[speak] failed to play", url);
    if (currentAudio === audio) currentAudio = null;
    // Skip broken clip so multi-clip sequences can continue.
    if (gen === speakGen && typeof onEnded === "function") onEnded();
  };

  const play = audio.play();
  if (play && typeof play.catch === "function") {
    play.catch((err) => {
      if (gen !== speakGen) return;
      console.warn("[speak]", err);
      if (typeof onEnded === "function") onEnded();
    });
  }
}

/**
 * Play one pre-baked clip by id + kind.
 * @param {string} id
 * @param {"card"|"name"} [kind]
 */
export function speakClip(id, kind = "name") {
  if (!id) return;
  const gen = ++speakGen;
  playUrlForGen(clipUrl(id, kind), gen);
}

/**
 * Play a sequence of pre-baked clips (stops prior speech).
 * @param {{ id: string, kind?: "card"|"name" }[]} parts
 */
export function speakSequence(parts) {
  const list = (parts || []).filter((p) => p && p.id);
  if (!list.length) return;
  if (speechMuted) return;
  const gen = ++speakGen;
  let i = 0;
  const next = () => {
    if (gen !== speakGen) return;
    if (i >= list.length) return;
    const part = list[i++];
    const more = i < list.length;
    playUrlForGen(clipUrl(part.id, part.kind || "name"), gen, more ? next : undefined);
  };
  next();
}

/**
 * Play the full place card narration (pre-baked).
 * @param {{ id: string }} place
 */
export function speakCard(place) {
  if (!place?.id) return;
  speakClip(place.id, "card");
}

/**
 * Play just the place name (Find quiz, etc.).
 * @param {{ id: string }} place
 */
export function speakName(place) {
  if (!place?.id) return;
  speakClip(place.id, "name");
}

/**
 * Play a moon-phase name clip (pre-baked).
 * @param {string} phaseId e.g. "full"
 */
export function speakPhase(phaseId) {
  if (!phaseId) return;
  speakClip(`phase-${phaseId}`, "name");
}
