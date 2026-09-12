---
name: verify-world-adventures
description: "Drive the World Adventures! web app (kid globe + space) the way a user does — launch the static server, exercise mapped features in a real browser, and capture proof. Use when proving UI behavior, after globe/card/find/space changes, or when asked to verify this app."
---

# Verify World Adventures!

Project-local control skill for **World Adventures!** — a static ES-module web app (`index.html` + `boot.js`) served by `serve.py`. An agent that has never seen the app should be able to launch, doctor, drive one mapped feature, capture evidence, and clean up from this file alone.

## Launch

Use an isolated verification port. Never drive a shared human session on `:8000` unless this run started it.

```bash
export PATH="$PWD/.cursor/skills/verify-world-adventures/bin:$PATH"
export WA_STATE_DIR="/tmp/wa-verify-${RUN_ID:-$$}"
export WA_PORT="${WA_PORT:-8765}"

control-world-adventures launch --port "$WA_PORT" --run-id "${RUN_ID:-manual}"
```

Ready when launch prints JSON with `url` (default `http://127.0.0.1:8765/`) and `serverPid`. The helper starts `python3 serve.py` with `PORT`/`HOST` set (repo `serve.py` reads both from the environment).

First-time harness install (once per checkout):

```bash
(cd .cursor/skills/verify-world-adventures && npm install && npx playwright install chromium)
```

Teardown is `control-world-adventures cleanup` (see Cleanup). It kills only the server and browser this run started.

## Doctor

Read-only health check for the instance recorded in `$WA_STATE_DIR`:

```bash
control-world-adventures doctor
```

Require `healthy: true` with:

- `server-process` — PID still alive
- `http` — `GET` url returns 200
- `document-title` — HTML contains `<title>World Adventures!</title>`
- `port-owned-by-us` — live process answering on the recorded port

If anything looks off after a failed drive, run doctor before retrying. Never drive an instance this run did not launch.

## HTTP (serve denylist)

Probe paths on the launched server (uses meta host/port):

```bash
control-world-adventures http --path /.git/config
control-world-adventures http --method HEAD --path /.git
control-world-adventures http --path /index.html
```

Expect `403` for `/.git`, `/.scratch`, and `/.cursor` prefixes; `200` for app assets. See [`features/serve-path-403.md`](features/serve-path-403.md).

## Drive

Harness: Playwright Chromium via `control-world-adventures browser …`. The first browser command starts a long-lived daemon (Unix socket under `$WA_STATE_DIR`) so page state survives across separate CLI invocations; `cleanup` stops that daemon. Prefer stable handles from this app:

| Handle | Meaning |
| --- | --- |
| `role=tab` name `Landmarks` / `Natural wonders` / `Continents` / `Countries` / `Space` | Adventure dock |
| `#strip .thumb[data-id="<id>"]` | Place shortcut chip (`title` = place name) |
| `.pin[data-id="iss"]` / aria-label `Space station` | ISS traveler pin (not on strip) |
| `#card` dialog, `#cardTitle`, `#cardPlace` | Place card |
| `role=button` name `Find this place` | Start Find quiz |
| `#findPrompt` / `#findCue` / `#findTally` | Find prompt chrome |
| `#ssSizesRow .ss-size-item.find-target` | Space Find highlighted body on the sizes strip |
| `role=button` name `Find another` | Next Find round after a win |
| `role=button` name `Surprise me` | Random place |
| `#moonPhaseBtn` text `Phases` | Moon phases (only on The Moon) |

Baseline before a recipe:

```bash
control-world-adventures doctor
control-world-adventures browser ready
```

`browser ready` waits until `#loader` has class `hide` and `#strip .thumb` exists.

Common actions:

```bash
control-world-adventures browser click --role tab --name "Space"
control-world-adventures browser click --selector '#strip .thumb[data-id="eiffel"]'
control-world-adventures browser click --selector '.pin[data-id="iss"]' --force
control-world-adventures browser wait --selector '#card:not([hidden])'
control-world-adventures browser text --selector '#cardTitle'
control-world-adventures browser eval --js 'document.body.className'
control-world-adventures browser pov --lat 18 --lng -18 --altitude 10 --ms 0
```

`browser pov` sets Earth camera look via Solar3D (for mid-orbit chrome). Feature recipes live under [`features/`](features/README.md). Drive the real user path (strip / tabs / Find / pin), not internal card setters.

## Evidence

Proof artifacts go under:

`.cursor/skills/verify-world-adventures/artifacts/<feature-id>/`

That directory survives cleanup. Relative `--path` values resolve there.

Standards:

- Exercise the real UI path (strip click, tab click, Find button) — not `card.openPlaceCard` from the console.
- Capture the action and the resulting state (e.g. strip click → card title text), not only a final screenshot.
- UI proof includes an ARIA-ish snapshot and a screenshot with the brand `World Adventures!` visible.
- Record the feature id and entry point in the artifact filenames or a sibling `proof.json`.
- Side effects here are mostly UI/DOM (card open, tab selected, find prompt visible). Find progress uses `localStorage`; prefer a fresh browser session per launch (the harness does).

```bash
control-world-adventures browser snapshot --aria --path place-card/card.aria.txt
control-world-adventures browser screenshot --path place-card/card.png
```

## Cleanup

```bash
control-world-adventures cleanup
```

Kills the `serve.py` PID and Playwright browser-server PID recorded in `$WA_STATE_DIR`, then removes that scratch meta/log. **Never deletes** `.cursor/skills/verify-world-adventures/artifacts/`. After cleanup, confirm evidence files still exist at the paths you wrote.

Do not `pkill -f serve.py` or kill by process name — only what this run started.

## Helpers

| Command | Role |
| --- | --- |
| `bin/control-world-adventures` | Bash wrapper (ensures `npm install`, runs the Node CLI) |
| `bin/control-world-adventures.mjs` | Launch / doctor / http / browser / cleanup |

Put `bin/` on `PATH` as shown in Launch. Every invocation above is literal.

## Isolate

- Default verify port is **8765** (`WA_PORT`). Human/dev default remains **8000**.
- One harness instance per `$WA_STATE_DIR`. Concurrent agents must use distinct `WA_STATE_DIR` and `WA_PORT`.
- Refusing to double-drive a shared instance beats corrupting someone's session.

## Maintenance

Keep the map honest with `/maintain-verification-skill` as the app changes.
