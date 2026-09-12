# Serve path 403

The LAN static server refuses sensitive tree prefixes so a device on the same network cannot fetch repo metadata through `serve.py`.

## Sub-features

- `block-git` returns HTTP 403 for `/.git` and nested git paths.
- `block-scratch` returns HTTP 403 for `/.scratch` paths.
- `block-cursor` returns HTTP 403 for `/.cursor` paths.
- `allow-app` still returns HTTP 200 for app assets such as `/index.html`.

## How to get to it (user POV)

- With the app server running, request blocked paths over HTTP (browser address bar, `curl`, or the harness `http` command).
- Normal app browsing of `/` and module scripts stays available.

## Driving it with control-world-adventures

Preconditions:

- A verification instance was started with `control-world-adventures launch` for this `WA_STATE_DIR`.
- `control-world-adventures doctor` reports `healthy: true`.
- No browser steps are required for the status checks.

- **Blocked git.** Run `control-world-adventures http --method GET --path /.git/config`. Expect `"status": 403`.
- **Blocked scratch.** Run `control-world-adventures http --path /.scratch/`. Expect status `403`.
- **Blocked cursor.** Run `control-world-adventures http --path /.cursor/skills/`. Expect status `403`.
- **HEAD also blocked.** Run `control-world-adventures http --method HEAD --path /.git`. Expect status `403`.
- **App still served.** Run `control-world-adventures http --path /index.html`. Expect status `200`.
- **Proof.** Write the JSON results into `.cursor/skills/verify-world-adventures/artifacts/serve-path-403/proof.json` (redirect or copy the command outputs). Keep doctor healthy afterward.

Example capture:

```bash
{
  control-world-adventures http --path /.git/config
  control-world-adventures http --path /index.html
} | tee "$(git rev-parse --show-toplevel)/.cursor/skills/verify-world-adventures/artifacts/serve-path-403/proof.json"
```

Prefer assembling a small JSON object by hand from the command results if `tee` of multiple JSON blobs is awkward.

## Gotchas

- Paths must start with `/` and are resolved against the launch URL host/port — do not hit a different server.
- A 404 on a blocked prefix is a regression; the denylist must answer **403**.
- Doctor only probes `/`. Passing doctor alone does not prove the denylist.
- This feature is HTTP-only; skip ARIA/screenshot requirements.
