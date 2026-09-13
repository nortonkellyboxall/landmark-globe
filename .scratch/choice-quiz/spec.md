# Choice quiz (multiple choice)

Status: ready-for-agent → shipping

## Goal

A kid-facing multiple-choice quiz that draws questions from **all Earth Places** already on the globe (landmarks, wonders, continents, countries) — not hardcoded demo questions. Space tab uses star/planet/moon bodies. Speech-first for kids who cannot read yet.

## Kid loop

1. Tap **❓ Quiz** in the top bar (beside Find).
2. Prompt shows a short cue + emoji (photo / flag when helpful) and **3–4 big choice buttons**.
3. Round start **auto-speaks** the cue (Hear re-speaks; focusing a choice speaks its label).
4. Wrong → soft boop, spoken “Almost. Try again!”, Luna oops; keep the same question (cue re-spoken).
5. Correct → fanfare, spoken “Yes!” + answer, score tally, **Next**.
6. × / Escape / adventure tab change exits. Starting Quiz stops Find (and the reverse).

## Module split

- `choice-quiz.js` — pool filters, continent join keys, question builders, round engine.
- `choice-game.js` — prompt chrome, choices DOM, score, Luna moods, auto-speak / Hear.
- Boot wires the Quiz button; Globe/CardMedia stay free of quiz rules (same ADR 0002 spirit as Find).
- Speech reuses Luna bake clips (`quiz-*` cues, place names, `lang-*` answers) via `speakSequence` / `speakClip`.

## Templates

| Type | Cue | Visual | Choices |
|------|-----|--------|---------|
| whereIs | Where is this? | photo | Place names |
| flagCountry | What country does this flag show? | big flag emoji | Country names |
| whichLanguage | What language do they speak here? | country emoji/photo | Language labels (`Place.language`) |
| whichInContinent | Which is in Africa? | continent emoji | Places |
| whichContinent | Which continent is this on? | place photo | Continents |
| whichKind | Which is a country? | mixed | Places |

## Design choice

Quiz uses the **full Earth catalog**, not the active adventure strip. Find stays strip/tab-scoped (tap-the-pin). Documented in the PR so operators can prefer strip-scoped Quiz later if wanted.

## Data gaps

- **Flags:** countries use flag emoji in `emoji` (no separate `flag` field) — enough for flagCountry.
- **Languages:** `language` on 43/48 countries. Omitted (honest gaps): India, Nigeria, South Africa, Switzerland, Singapore (many official languages).
