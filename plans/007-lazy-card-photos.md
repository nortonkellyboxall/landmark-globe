# Plan 007: Lazy-load card photos and smaller Wikimedia thumbs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- card-media.js tests/card-media.check.js landmarks.js wonders.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

Opening a Place card builds up to **six** `<img>`s. `img.src` is assigned **before** `img.loading`, so `lazy` never applies (the fetch already started). Pack URLs are Wikimedia thumbs at **960px** (`landmarks.js` / `wonders.js`). The hero is about 16/10 and `max-height: min(32dvh, 280px)` (`app.css` `.card-hero`) — 960px is larger than the display. That stalls card open animation (opacity/transform on `.card-hero`) and burns memory. Fix the loader order, request ~640px thumbs for Wikimedia, keep existing paths for non-Wikimedia URLs. Do not rewrite content packs by hand (helper at runtime). ADR 0002: CardMedia stays free of quiz rules — this is gallery-only.

## Current state

```74:96:card-media.js
  function buildGallery(lm) {
    const photos = (lm.photos && lm.photos.length ? lm.photos : []).slice(0, 6);
    // ...
      photos.forEach((src, i) => {
        const slide = document.createElement("div");
        slide.className = "photo-slide";
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${lm.name} photo ${i + 1}`;
        img.loading = i === 0 ? "eager" : "lazy";
        img.decoding = "async";
```

Example pack URL (`landmarks.js:14-17`):

`https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg`

`createCardMedia` uses `window.matchMedia` only when **called**, not at import time. `speak.js` import is side-effect light (no Audio until play). Node **can** `import { cardPhotoUrl } from "../card-media.js"` if that helper is a pure export and does not touch `window`.

Do **not** import `createCardMedia` in tests (needs `window.matchMedia` and `els`).

Ponytail: one helper `cardPhotoUrl(src, { width, index })` plus attribute order. Do not add a carousel virtualizer or `srcset` machinery beyond a single rewritten URL. Mounting only slide 0+1 is optional extra — **do it** if cheap: still create all slide shells/dots (chrome), but only set `src` on index `<= 1` and set later `src` when `photoIndex` changes. If that spreads into `updatePhotoChrome` complexity, **only** do URL rewrite + attribute order (still meets the finding). Prefer the cheaper pair first; add neighbor-only `src` only if `updatePhotoChrome` already knows `photoIndex` (it does).

Read `updatePhotoChrome` before neighbor-only src; if it only updates dots/transform, adding src-on-demand is a small extra in `showPhoto(i)`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| New check | `node tests/card-media.check.js` | `card-media.check.js OK` |
| Full | eleven checks including the new file | all OK |

After this plan there are **11** Node checks. Add `node tests/card-media.check.js` to any mental list that still says ten.

## Scope

**In scope**:
- `card-media.js` — export `cardPhotoUrl`; `buildGallery` attribute order; optional deferred `src`
- `tests/card-media.check.js` (create)

**Out of scope**:
- Editing every URL in `landmarks.js` / `wonders.js` / geography packs
- Locally hosting photos
- Video/anthem (`YouTube`) paths
- `app.css` hero size
- Find quiz / Globe

## Git workflow

- Branch: `feature/perf-card-photos` or shared wave branch
- Commit: `perf(card): lazy thumbs at display size`
- graphify after commit

## Steps

### Step 1: RED — `cardPhotoUrl`

Create `tests/card-media.check.js`:

```js
import assert from "node:assert/strict";
import { cardPhotoUrl } from "../card-media.js";

const wiki960 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg";
assert.equal(
  cardPhotoUrl(wiki960, 640),
  wiki960.replace("960px-", "640px-")
);
assert.equal(cardPhotoUrl(wiki960, 640).includes("640px-"), true);
assert.equal(cardPhotoUrl(wiki960, 640).includes("960px-"), false);

const other = "https://example.com/pic.jpg";
assert.equal(cardPhotoUrl(other, 640), other);

assert.equal(cardPhotoUrl("", 640), "");
assert.equal(cardPhotoUrl(null, 640), null);

console.log("card-media.check.js OK");
```

**Verify**: fails (no export). RED.

### Step 2: Implement `cardPhotoUrl`

Export from `card-media.js` (top of file, after imports):

```js
const WIKI_PX = /\/(\d+)px-/;

export function cardPhotoUrl(src, width) {
  if (typeof src !== "string" || !src) return src;
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return src;
  if (!src.includes("upload.wikimedia.org")) return src;
  return src.replace(WIKI_PX, `/${Math.round(w)}px-`);
}
```

Display width **640** is the runtime argument from `buildGallery` (hero ~560 CSS px max, 640 covers 2× on small phones without 960). Do not use 960.

**Verify**: `node tests/card-media.check.js` OK.

### Step 3: `buildGallery` attribute order and URL

For each img:

```js
img.alt = `${lm.name} photo ${i + 1}`;
img.decoding = "async";
img.loading = i === 0 ? "eager" : "lazy";
const url = cardPhotoUrl(src, 640);
if (i === 0) {
  img.src = url;
} else {
  img.dataset.src = url;
}
```

When advancing photos, a function already sets `photoIndex` — set `img.src = img.dataset.src` for the new index and `index + 1` if present. If you cannot find a single `showPhoto`/`updatePhotoChrome` without a 20-line hunt, **set `src` on all images** after `loading` (still fixes lazy for i>0) and skip `dataset.src`. Comment in the commit which path you took.

Never assign `src` before `loading`.

**Verify**: `rg -U "img.src = src" card-media.js` no match. `rg "cardPhotoUrl" card-media.js` used in `buildGallery`. `node tests/card-media.check.js` OK.

### Step 4: Register the check in your local habit

Run:

```bash
node tests/card-media.check.js
node tests/orbit-look.check.js
# plus the other nine existing checks
```

**Verify**: 11 OK lines.

## Test plan

- `tests/card-media.check.js` as Step 1 (wiki rewrite, non-wiki passthrough, empty/null).
- Pattern: `tests/sound.check.js` (pure export, no els).
- Do not construct `createCardMedia` in Node.
- Human: open Eiffel card — first photo shows; swipe/dots load others; broken URL still gets `.broken` class.

## Done criteria

- [ ] `cardPhotoUrl` exported and tested
- [ ] `loading` set before `src`
- [ ] Wikimedia 960px rewritten to 640px at runtime; packs on disk unchanged
- [ ] 11 Node checks OK
- [ ] README 007 DONE; graphify updated

## STOP conditions

- Importing `card-media.js` in Node throws (Audio/`window` at module scope) — move `cardPhotoUrl` to a 20-line `card-photo-url.js` next to it and test that; do not jsdom.
- Wikimedia 640px URLs 404 in smoke — STOP, revert to original src for that host, report (some files only have 960).
- You bulk-edit `landmarks.js` photo strings.

## Maintenance notes

- New photo hosts: extend `cardPhotoUrl` with another passthrough, do not special-case in `buildGallery`.
- Reviewer: confirm `src` is never assigned before `loading`; confirm packs are untouched.
