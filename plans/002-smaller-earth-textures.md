# Plan 002: Ship 2048px Earth textures

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- globe-app.js textures/earth/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (close zoom can look softer)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

Startup loads `textures/earth/earth-blue-marble.jpg` at **4096×2048** (1,461,877 bytes). Decoded RGBA is about **34 MiB** on the GPU. The on-screen globe is a few hundred CSS pixels. `earth-topology.png` is 2048×1024 (378,243 bytes, ~8 MiB decoded). Phones pay this on every visit. Halving each dimension cuts texel memory ~4× with little visible loss at play zoom. Do not add a bundler; swap the image files and keep `DEFAULT_TEXTURES` paths.

## Current state

```17:24:globe-app.js
const DEFAULT_TEXTURES = {
  day: "textures/earth/earth-blue-marble.jpg",
  bump: "textures/earth/earth-topology.png",
  moon: "textures/planets/moon.jpg",
  clouds:
    "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-clouds.png",
  night: "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-night.jpg",
};
```

On-disk at `63369fe` (bytes): marble 1461877, topology 378243, moon 238093 (1024×512 — **leave moon and remote night/clouds alone**).

`createGlobe` passes `textures.day` / `textures.bump` into globe.gl `.globeImageUrl` / `.bumpImageUrl` (~248–250). Callers never set custom texture URLs from boot.

Conventions: no new npm deps. Resize with macOS `sips` (already on Darwin). Globe module stays the adapter; do not touch globe.gl internals (ADR 0002 / CONTEXT: Globe callers never touch materials).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Dimensions | `sips -g pixelWidth -g pixelHeight textures/earth/earth-blue-marble.jpg` | width/height printed |
| Checks | `node tests/orbit-look.check.js` (and the other nine) | OK, exit 0 |
| File size | `stat -f %z textures/earth/earth-blue-marble.jpg` | well under 1461877 |

## Scope

**In scope**:
- `textures/earth/earth-blue-marble.jpg` (replace contents; same filename)
- `textures/earth/earth-topology.png` (replace contents; same filename)
- Optional: keep copies `textures/earth/earth-blue-marble-4096.jpg` and `earth-topology-2048.png` **only if** they already exist after you copy — actually **do not** keep 4096 duplicates in git (doubles the repo). Overwrite in place.

**Out of scope**:
- `textures/planets/moon.jpg`
- Remote `earth-clouds.png` / `earth-night.jpg` URLs
- `globe-app.js` path strings (keep filenames)
- `serve.py`, bundler, WebP conversion (no new toolchain)
- `solar3d.js` procedural canvases (plan 006)

## Git workflow

- Branch: `feature/perf-earth-textures` or shared wave branch
- Commit: `perf(globe): shrink earth day and bump maps`
- Binary files in the same commit as nothing else
- `graphify update .` after commit (likely no topology change)

## Steps

### Step 1: Record current dimensions (baseline)

```bash
sips -g pixelWidth -g pixelHeight textures/earth/earth-blue-marble.jpg
sips -g pixelWidth -g pixelHeight textures/earth/earth-topology.png
```

**Verify**: marble **4096×2048**, topology **2048×1024**. If not, STOP (already resized or different asset).

### Step 2: Resize in place with sips

`sips -z` takes **height then width**.

```bash
sips -z 1024 2048 textures/earth/earth-blue-marble.jpg
sips -z 512 1024 textures/earth/earth-topology.png
```

**Verify**:

```bash
sips -g pixelWidth -g pixelHeight textures/earth/earth-blue-marble.jpg
sips -g pixelWidth -g pixelHeight textures/earth/earth-topology.png
```

Marble **2048×1024**, topology **1024×512**. JPEG/PNG still openable. `stat -f %z` on marble is **< 800000** bytes (typical); if still ~1.4MB, STOP (resize did not rewrite).

Do not change `DEFAULT_TEXTURES` keys or URLs.

### Step 3: Smoke the globe (human or note pending)

No Node test can decode the JPEG into globe.gl. After resize, `git status` should show only the two texture files.

**Verify**: `git diff --stat` lists only `textures/earth/earth-blue-marble.jpg` and `textures/earth/earth-topology.png`. Existing `node tests/*.check.js` still pass (they do not load these files).

## Test plan

- No new `*.check.js` (binary assets). Done criteria are `sips` dimensions + checks still green.
- Human smoke (not blocking the commit, note in the PR/report): Earth still sharp at default intro altitude (~2.45); optional close zoom. If marble looks like a smear at default view, STOP and restore from `git checkout -- textures/earth/`.

## Done criteria

- [ ] marble is 2048×1024; topology is 1024×512 (`sips -g`)
- [ ] `DEFAULT_TEXTURES.day` and `.bump` paths unchanged
- [ ] moon + remote night/cloud URLs unchanged
- [ ] ten Node checks still OK
- [ ] `plans/README.md` 002 is DONE
- [ ] graphify updated after commit

## STOP conditions

- `sips` missing or refuses JPEG (not Darwin) — report; do not add ImageMagick/npm.
- Dimensions after Step 1 are already 2048×1024 — skip, mark DONE with note.
- Default-view Earth looks broken after resize (restore files, report).
- Temptation to convert to KTX2/basis/webp — out of scope.

## Maintenance notes

- Replacing the marble later: keep ≤2048 on the wide edge unless a retina kiosk needs 4096.
- Reviewer: confirm git LFS is not required (these files are already tracked as normal binaries).
- Remote night/clouds from jsDelivr are still a startup cost; deferred on purpose.
