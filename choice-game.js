/** Choice quiz UI — multiple-choice prompt beside Find / Luna. */

import {
  choicePool,
  createChoiceQuiz,
  earthChoicePool,
  spaceChoicePool,
} from "./choice-quiz.js";

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
 *   getEarthPlaces: () => object[],
 *   getSpacePlaces: () => object[],
 *   getContinents: () => object[],
 *   card: { close: () => void },
 *   stopFind: () => void,
 *   playPop: () => void,
 *   playFanfare: () => void,
 *   playBoop: () => void,
 *   ensureAudio: () => void,
 *   speakName: (place: object) => void,
 *   setLunaMood: (mood: string, emoji?: string) => void,
 *   sparkBurst: (x: number, y: number) => void,
 *   flashFound: () => void,
 * }} opts
 */
export function createChoiceGame(opts) {
  const els = opts.els;
  let lastQuestion = null;
  let awaitingNext = false;

  function syncScore() {
    if (!els.choiceScore) return;
    const { asked, correct } = quiz.score();
    els.choiceScore.hidden = asked === 0;
    els.choiceScore.textContent = correct + " ★ · " + asked;
  }

  function clearChoices() {
    if (!els.choiceOptions) return;
    els.choiceOptions.innerHTML = "";
  }

  function hidePrompt() {
    if (!els.choicePrompt) return;
    els.choicePrompt.hidden = true;
    els.choicePrompt.classList.remove("found", "oops");
    const body = docBody();
    if (body && body.classList) body.classList.remove("choice-mode");
    if (els.choiceNext) els.choiceNext.hidden = true;
    if (els.choiceCue) els.choiceCue.textContent = "Quiz time!";
    clearChoices();
    lastQuestion = null;
    awaitingNext = false;
    opts.setLunaMood("idle");
  }

  function renderChoices(question, locked) {
    if (!els.choiceOptions || typeof els.choiceOptions.appendChild !== "function") return;
    clearChoices();
    (question.choices || []).forEach((opt) => {
      const btn = makeEl("button");
      if (!btn) return;
      btn.type = "button";
      btn.className = "choice-option";
      btn.dataset.id = opt.id;
      btn.setAttribute("aria-label", opt.label);
      btn.innerHTML =
        '<span class="choice-emoji" aria-hidden="true">' +
        (opt.emoji || "📍") +
        '</span><span class="choice-label">' +
        opt.label +
        "</span>";
      if (locked) {
        btn.disabled = true;
        if (opt.id === question.correctId) btn.classList.add("correct");
      } else {
        btn.addEventListener("click", () => handleAnswer(opt.id));
      }
      els.choiceOptions.appendChild(btn);
    });
  }

  function showPrompt(question) {
    if (!els.choicePrompt || !question) return;
    lastQuestion = question;
    awaitingNext = false;
    els.choicePrompt.hidden = false;
    els.choicePrompt.classList.remove("found", "oops");
    const body = docBody();
    if (body && body.classList) body.classList.add("choice-mode");
    if (els.choiceCue) els.choiceCue.textContent = question.prompt;
    if (els.choiceNext) els.choiceNext.hidden = true;
    syncScore();
    opts.setLunaMood("hunt", "❓");
    if (els.choiceEmoji) {
      const emoji =
        question.type === "whichInContinent"
          ? question.subject.emoji || "🌍"
          : question.subject.emoji || "📍";
      els.choiceEmoji.textContent = emoji;
    }
    if (els.choicePhoto) {
      const src =
        question.type === "whereIs" || question.type === "whichContinent"
          ? question.photo
          : null;
      if (src) {
        els.choicePhoto.hidden = false;
        els.choicePhoto.src = src;
        els.choicePhoto.alt = question.subject.name || "";
      } else {
        els.choicePhoto.hidden = true;
        els.choicePhoto.removeAttribute("src");
        els.choicePhoto.alt = "";
      }
    }
    renderChoices(question, false);
  }

  function markCorrect(question) {
    if (!els.choicePrompt) return;
    els.choicePrompt.classList.remove("oops");
    els.choicePrompt.classList.add("found");
    if (els.choiceCue) {
      const label =
        (question.choices || []).find((c) => c.id === question.correctId)?.label ||
        question.subject.name ||
        "You got it!";
      els.choiceCue.textContent = "Yes! " + label;
    }
    if (els.choiceNext) els.choiceNext.hidden = false;
    awaitingNext = true;
    opts.setLunaMood("cheer", "🎉");
    renderChoices(question, true);
    syncScore();
  }

  function markWrong(choiceId) {
    if (!els.choicePrompt) return;
    els.choicePrompt.classList.remove("found");
    els.choicePrompt.classList.add("oops");
    if (els.choiceCue) els.choiceCue.textContent = "Almost — try again!";
    opts.setLunaMood("oops", "🙈");
    if (els.choiceOptions && typeof els.choiceOptions.querySelector === "function") {
      const btn = els.choiceOptions.querySelector(`[data-id="${choiceId}"]`);
      if (btn) {
        btn.classList.remove("wrong");
        void btn.offsetWidth;
        btn.classList.add("wrong");
        if (typeof btn.addEventListener === "function") {
          btn.addEventListener(
            "animationend",
            () => btn.classList.remove("wrong"),
            { once: true }
          );
        }
      }
    }
    setTimeout(() => {
      if (quiz.isActive()) {
        els.choicePrompt.classList.remove("oops");
        if (els.choiceCue && lastQuestion) els.choiceCue.textContent = lastQuestion.prompt;
        opts.setLunaMood("hunt", "❓");
      }
    }, 700);
  }

  function burstFrom(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();
    opts.sparkBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const quiz = createChoiceQuiz({
    onPrompt(question) {
      showPrompt(question);
    },
    onCorrect(question) {
      opts.playFanfare();
      opts.flashFound();
      markCorrect(question);
      burstFrom(els.luna);
    },
    onWrong(choiceId) {
      opts.playBoop();
      markWrong(choiceId);
    },
    onCancel() {
      hidePrompt();
    },
  });

  function currentPool() {
    const tab = opts.getTab();
    if (tab === "space") return spaceChoicePool(opts.getSpacePlaces());
    // Full Earth catalog — not just the active adventure strip — so Quiz covers
    // landmarks, wonders, continents, and countries together.
    return earthChoicePool(opts.getEarthPlaces());
  }

  function start() {
    opts.stopFind();
    if (els.card && els.card.classList && els.card.classList.contains("open")) opts.card.close();
    quiz.cancel();
    const pool = currentPool();
    const round = quiz.start(pool, {
      continents: opts.getContinents(),
      tab: opts.getTab(),
    });
    if (!round) return;
    opts.playPop();
    syncScore();
  }

  function next() {
    if (!awaitingNext && quiz.isActive()) return;
    start();
  }

  function stop() {
    quiz.cancel();
    quiz.resetScore();
    hidePrompt();
    syncScore();
  }

  function handleAnswer(choiceId) {
    if (awaitingNext || !quiz.isActive()) return;
    quiz.answer(choiceId);
  }

  function speakSubject(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    const q = quiz.getQuestion() || lastQuestion;
    if (!q || !q.subject || !q.subject.name) return;
    opts.ensureAudio();
    opts.speakName(q.subject);
  }

  return {
    start,
    next,
    stop,
    handleAnswer,
    speakSubject,
    isActive: () => quiz.isActive() || awaitingNext || !!(els.choicePrompt && !els.choicePrompt.hidden),
    getQuestion: () => quiz.getQuestion() || lastQuestion,
    score: () => quiz.score(),
    /** @deprecated test helper */
    _poolForTab: (tab) => choicePool(tab, tab === "space" ? opts.getSpacePlaces() : opts.getEarthPlaces()),
  };
}
