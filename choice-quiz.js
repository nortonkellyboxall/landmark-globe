/** Choice quiz — multiple-choice rounds from live Place packs (not hardcoded). */

/**
 * @typedef {object} Place
 * @property {string} id
 * @property {string} [name]
 * @property {string} [emoji]
 * @property {string} [continent]
 * @property {string} [kind]
 * @property {string} [language]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {string[]} [photos]
 * @property {string} [place]
 */

/**
 * @typedef {object} ChoiceOption
 * @property {string} id
 * @property {string} label
 * @property {string} [emoji]
 * @property {string} [speakId]
 */

/**
 * @typedef {object} ChoiceQuestion
 * @property {string} type
 * @property {string} prompt
 * @property {Place} subject
 * @property {ChoiceOption[]} choices
 * @property {string} correctId
 * @property {string} [photo]
 * @property {string} [speakCueId]
 * @property {string} [speakSubjectId]
 */

const SPACE_KINDS = new Set(["star", "planet", "moon", "belt", "comet", "station"]);

const LABEL_TO_ID = {
  Africa: "africa",
  Antarctica: "antarctica",
  Asia: "asia",
  Europe: "europe",
  Oceania: "oceania",
};

const KIND_LABEL = {
  landmark: "landmark",
  wonder: "natural wonder",
  country: "country",
  continent: "continent",
  star: "star",
  planet: "planet",
  moon: "moon",
};

const KIND_CUE = {
  landmark: "quiz-kind-landmark",
  wonder: "quiz-kind-wonder",
  country: "quiz-kind-country",
  continent: "quiz-kind-continent",
  star: "quiz-kind-star",
  planet: "quiz-kind-planet",
  moon: "quiz-kind-moon",
};

/** Regional-indicator pair ≈ national flag emoji. */
const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

/**
 * @param {Place} place
 * @returns {string | null}
 */
export function continentKey(place) {
  if (!place) return null;
  if (place.kind === "continent" && place.id) return place.id;
  if (place.kind === "country" && place.continent) return place.continent;
  if (SPACE_KINDS.has(place.kind)) return null;
  const label = place.continent;
  if (label === "Americas") {
    if (place.lat == null) return null;
    return place.lat >= 7 ? "northamerica" : "southamerica";
  }
  return LABEL_TO_ID[label] || null;
}

/**
 * @param {Place} place
 * @returns {string}
 */
export function placeKind(place) {
  if (!place) return "landmark";
  if (place.kind) return place.kind;
  return "landmark";
}

/**
 * Stable clip id for a spoken language label (mirrors bake-speech).
 * @param {string} language
 * @returns {string}
 */
export function languageSpeakId(language) {
  const slug = String(language || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `lang-${slug}` : "";
}

/**
 * @param {Place} place
 * @returns {boolean}
 */
export function hasFlagEmoji(place) {
  return !!(place && placeKind(place) === "country" && place.emoji && FLAG_EMOJI_RE.test(place.emoji));
}

/**
 * Earth Places kids can quiz on (landmarks, wonders, continents, countries).
 * @param {Place[]} places
 * @returns {Place[]}
 */
export function earthChoicePool(places) {
  return (places || []).filter(
    (p) =>
      p &&
      p.id &&
      p.name &&
      !SPACE_KINDS.has(placeKind(p)) &&
      p.lat != null &&
      p.lng != null
  );
}

/**
 * Space Find-style bodies for Space-tab quiz rounds.
 * @param {Place[]} places
 * @returns {Place[]}
 */
export function spaceChoicePool(places) {
  return (places || []).filter((p) => {
    const kind = placeKind(p);
    return p && p.id && p.name && (kind === "star" || kind === "planet" || kind === "moon");
  });
}

/**
 * @param {string} tab
 * @param {Place[]} places
 * @returns {Place[]}
 */
export function choicePool(tab, places) {
  if (tab === "space") return spaceChoicePool(places);
  return earthChoicePool(places);
}

/**
 * @param {Place[]} list
 * @param {() => number} rand
 * @returns {Place | null}
 */
function pickOne(list, rand) {
  if (!list || !list.length) return null;
  return list[Math.floor(rand() * list.length)];
}

/**
 * @template T
 * @param {T[]} list
 * @param {() => number} rand
 * @returns {T[]}
 */
function shuffle(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * @param {Place[]} pool
 * @param {Place} correct
 * @param {number} count
 * @param {() => number} rand
 * @param {(p: Place) => boolean} [ok]
 * @returns {Place[]}
 */
function pickDistractors(pool, correct, count, rand, ok) {
  const others = pool.filter((p) => p.id !== correct.id && (!ok || ok(p)));
  return shuffle(others, rand).slice(0, count);
}

/**
 * @param {Place} place
 * @returns {ChoiceOption}
 */
function placeOption(place) {
  return {
    id: place.id,
    label: place.name || place.id,
    emoji: place.emoji || "📍",
    speakId: place.id,
  };
}

/**
 * @param {string} language
 * @returns {ChoiceOption | null}
 */
function languageOption(language) {
  const speakId = languageSpeakId(language);
  if (!speakId) return null;
  return {
    id: speakId,
    label: language,
    emoji: "🗣️",
    speakId,
  };
}

/**
 * @param {Place[]} continents
 * @param {string} id
 * @returns {ChoiceOption | null}
 */
function continentOption(continents, id) {
  const hit = (continents || []).find((c) => c.id === id);
  if (!hit) return null;
  return placeOption(hit);
}

/**
 * Speak plan for a question prompt (cue ± subject name).
 * @param {ChoiceQuestion} question
 * @returns {{ id: string, kind?: "name" }[]}
 */
export function promptSpeakPlan(question) {
  if (!question) return [];
  /** @type {{ id: string, kind?: "name" }[]} */
  const parts = [];
  if (question.speakCueId) parts.push({ id: question.speakCueId, kind: "name" });
  if (question.speakSubjectId) parts.push({ id: question.speakSubjectId, kind: "name" });
  return parts;
}

/**
 * “Where is this?” — name the pictured Place.
 * @param {Place[]} pool
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildWhereIs(pool, rand = Math.random) {
  const list = (pool || []).filter((p) => p && p.name);
  if (list.length < 3) return null;
  const subject = pickOne(list, rand);
  if (!subject) return null;
  const distractors = pickDistractors(list, subject, 3, rand);
  if (distractors.length < 2) return null;
  const choices = shuffle([subject, ...distractors].map(placeOption), rand).slice(0, 4);
  return {
    type: "whereIs",
    prompt: "Where is this?",
    subject,
    choices,
    correctId: subject.id,
    photo: subject.photos && subject.photos[0],
    speakCueId: "quiz-where-is",
  };
}

/**
 * “What country does this flag show?” — flag emoji → country name.
 * @param {Place[]} pool
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildFlagCountry(pool, rand = Math.random) {
  const list = (pool || []).filter((p) => hasFlagEmoji(p));
  if (list.length < 3) return null;
  const subject = pickOne(list, rand);
  if (!subject) return null;
  const distractors = pickDistractors(list, subject, 3, rand);
  if (distractors.length < 2) return null;
  const choices = shuffle([subject, ...distractors].map(placeOption), rand).slice(0, 4);
  return {
    type: "flagCountry",
    prompt: "What country does this flag show?",
    subject,
    choices,
    correctId: subject.id,
    speakCueId: "quiz-flag-country",
  };
}

/**
 * “What language do they speak here?” — country → language (honest Place.language only).
 * @param {Place[]} pool
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildWhichLanguage(pool, rand = Math.random) {
  const list = (pool || []).filter(
    (p) => placeKind(p) === "country" && p.language && languageSpeakId(p.language)
  );
  if (list.length < 1) return null;
  const subject = pickOne(list, rand);
  if (!subject || !subject.language) return null;
  const correctOpt = languageOption(subject.language);
  if (!correctOpt) return null;
  const otherLangs = [
    ...new Set(
      list
        .map((p) => p.language)
        .filter((lang) => lang && lang !== subject.language)
        .map((lang) => String(lang))
    ),
  ];
  if (otherLangs.length < 2) return null;
  const distractors = shuffle(otherLangs, rand)
    .slice(0, 3)
    .map((lang) => languageOption(lang))
    .filter(Boolean);
  if (distractors.length < 2) return null;
  const choices = shuffle([correctOpt, ...distractors], rand).slice(0, 4);
  return {
    type: "whichLanguage",
    prompt: "What language do they speak here?",
    subject,
    choices,
    correctId: correctOpt.id,
    photo: subject.photos && subject.photos[0],
    speakCueId: "quiz-language",
    speakSubjectId: subject.id,
  };
}

/**
 * “Which is in Africa?” — pick a Place from a continent.
 * @param {Place[]} pool
 * @param {Place[]} continents
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildWhichInContinent(pool, continents, rand = Math.random) {
  const keyed = (pool || [])
    .filter((p) => placeKind(p) !== "continent")
    .map((p) => ({ place: p, key: continentKey(p) }))
    .filter((row) => row.key);
  const byKey = new Map();
  for (const row of keyed) {
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key).push(row.place);
  }
  const keys = [...byKey.keys()].filter((k) => byKey.get(k).length > 0);
  if (keys.length < 2) return null;
  const correctKey = pickOne(keys, rand);
  const subjectContinent = (continents || []).find((c) => c.id === correctKey);
  if (!subjectContinent) return null;
  const correct = pickOne(byKey.get(correctKey), rand);
  if (!correct) return null;
  const otherKeys = keys.filter((k) => k !== correctKey);
  const distractors = [];
  const used = new Set([correct.id]);
  for (const key of shuffle(otherKeys, rand)) {
    const pick = pickOne(
      byKey.get(key).filter((p) => !used.has(p.id)),
      rand
    );
    if (!pick) continue;
    distractors.push(pick);
    used.add(pick.id);
    if (distractors.length >= 3) break;
  }
  if (distractors.length < 2) return null;
  const choices = shuffle([correct, ...distractors].map(placeOption), rand).slice(0, 4);
  return {
    type: "whichInContinent",
    prompt: `Which is in ${subjectContinent.name}?`,
    subject: subjectContinent,
    choices,
    correctId: correct.id,
    photo: correct.photos && correct.photos[0],
    speakCueId: "quiz-which-in",
    speakSubjectId: subjectContinent.id,
  };
}

/**
 * “Which continent is this on?”
 * @param {Place[]} pool
 * @param {Place[]} continents
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildWhichContinent(pool, continents, rand = Math.random) {
  const list = (pool || []).filter((p) => placeKind(p) !== "continent" && continentKey(p));
  const conts = (continents || []).filter((c) => c && c.id && c.name);
  if (list.length < 1 || conts.length < 3) return null;
  const subject = pickOne(list, rand);
  if (!subject) return null;
  const correctKey = continentKey(subject);
  const correctOpt = continentOption(conts, correctKey);
  if (!correctOpt) return null;
  const distractors = shuffle(
    conts.filter((c) => c.id !== correctKey).map((c) => placeOption(c)),
    rand
  ).slice(0, 3);
  if (distractors.length < 2) return null;
  const choices = shuffle([correctOpt, ...distractors], rand).slice(0, 4);
  return {
    type: "whichContinent",
    prompt: "Which continent is this on?",
    subject,
    choices,
    correctId: correctKey,
    photo: subject.photos && subject.photos[0],
    speakCueId: "quiz-which-continent",
    speakSubjectId: subject.id,
  };
}

/**
 * “Which is a country?” / kind pick.
 * @param {Place[]} pool
 * @param {() => number} rand
 * @returns {ChoiceQuestion | null}
 */
export function buildWhichKind(pool, rand = Math.random) {
  const byKind = new Map();
  for (const p of pool || []) {
    const kind = placeKind(p);
    if (!KIND_LABEL[kind]) continue;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(p);
  }
  const kinds = [...byKind.keys()].filter((k) => byKind.get(k).length > 0);
  if (kinds.length < 2) return null;
  const targetKind = pickOne(kinds, rand);
  const correct = pickOne(byKind.get(targetKind), rand);
  if (!correct) return null;
  const distractors = [];
  const used = new Set([correct.id]);
  for (const kind of shuffle(
    kinds.filter((k) => k !== targetKind),
    rand
  )) {
    const pick = pickOne(
      byKind.get(kind).filter((p) => !used.has(p.id)),
      rand
    );
    if (!pick) continue;
    distractors.push(pick);
    used.add(pick.id);
    if (distractors.length >= 3) break;
  }
  if (distractors.length < 2) return null;
  const choices = shuffle([correct, ...distractors].map(placeOption), rand).slice(0, 4);
  const label = KIND_LABEL[targetKind] || targetKind;
  const article = /^[aeiou]/i.test(label) ? "an" : "a";
  return {
    type: "whichKind",
    prompt: `Which is ${article} ${label}?`,
    subject: correct,
    choices,
    correctId: correct.id,
    photo: correct.photos && correct.photos[0],
    speakCueId: KIND_CUE[targetKind] || "quiz-kind-landmark",
  };
}

/**
 * Build one question from the richest templates that fit the pool.
 * @param {Place[]} pool
 * @param {{ continents?: Place[], tab?: string, rand?: () => number }} [opts]
 * @returns {ChoiceQuestion | null}
 */
export function buildChoiceQuestion(pool, opts = {}) {
  const rand = opts.rand || Math.random;
  const continents = opts.continents || pool.filter((p) => placeKind(p) === "continent");
  const tryOrder = shuffle(
    opts.tab === "space"
      ? [buildWhereIs, buildWhichKind]
      : [
          buildWhereIs,
          buildFlagCountry,
          buildWhichLanguage,
          buildWhichInContinent,
          buildWhichContinent,
          buildWhichKind,
        ],
    rand
  );
  for (const fn of tryOrder) {
    let q = null;
    if (fn === buildWhichInContinent || fn === buildWhichContinent) {
      q = fn(pool, continents, rand);
    } else {
      q = fn(pool, rand);
    }
    if (q) return q;
  }
  return null;
}

/**
 * @param {{
 *   onPrompt?: (q: ChoiceQuestion) => void,
 *   onCorrect?: (q: ChoiceQuestion) => void,
 *   onWrong?: (choiceId: string, q: ChoiceQuestion) => void,
 *   onCancel?: () => void,
 * }} [opts]
 */
export function createChoiceQuiz(opts = {}) {
  let active = null;
  let asked = 0;
  let correct = 0;

  function cancel() {
    if (!active) return;
    active = null;
    if (opts.onCancel) opts.onCancel();
  }

  /**
   * @param {Place[]} pool
   * @param {{ continents?: Place[], tab?: string, rand?: () => number }} [startOpts]
   */
  function start(pool, startOpts = {}) {
    const list = (pool || []).filter((p) => p && p.id && p.name);
    if (list.length < 3) return null;
    active = null;
    const question = buildChoiceQuestion(list, startOpts);
    if (!question) return null;
    active = question;
    asked += 1;
    if (opts.onPrompt) opts.onPrompt(question);
    return question;
  }

  /** @param {string} choiceId */
  function answer(choiceId) {
    if (!active) return { handled: false };
    if (choiceId === active.correctId) {
      const q = active;
      active = null;
      correct += 1;
      if (opts.onCorrect) opts.onCorrect(q);
      return { handled: true, correct: true, question: q };
    }
    if (opts.onWrong) opts.onWrong(choiceId, active);
    return { handled: true, correct: false, question: active };
  }

  function resetScore() {
    asked = 0;
    correct = 0;
  }

  return {
    start,
    cancel,
    answer,
    resetScore,
    isActive: () => !!active,
    getQuestion: () => active,
    score: () => ({ asked, correct }),
  };
}
