#!/usr/bin/env node
/**
 * Verification harness for World Adventures!
 * Invocation examples are documented in ../SKILL.md.
 *
 * Browser commands talk to a long-lived daemon over a Unix socket so page
 * state survives across separate CLI invocations.
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection, createServer } from "node:net";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");
const DEFAULT_STATE_DIR = process.env.WA_STATE_DIR || "/tmp/wa-verify";
const DEFAULT_PORT = Number(process.env.WA_PORT || process.env.PORT || 8765);
const ARTIFACTS_ROOT = join(SKILL_ROOT, "artifacts");
const SELF = fileURLToPath(import.meta.url);

function usage(code = 1) {
  process.stderr.write(`control-world-adventures — drive World Adventures for verification

Usage:
  control-world-adventures launch [--port N] [--run-id ID]
  control-world-adventures doctor
  control-world-adventures browser ready
  control-world-adventures browser click --selector <css>
  control-world-adventures browser click --role <role> --name <name>
  control-world-adventures browser wait --selector <css> [--state visible|hidden|attached]
  control-world-adventures browser text --selector <css>
  control-world-adventures browser eval --js <expression>
  control-world-adventures browser snapshot --aria --path <file>
  control-world-adventures browser screenshot --path <file>
  control-world-adventures cleanup

Env:
  WA_STATE_DIR   Runtime state directory (default /tmp/wa-verify)
  WA_PORT / PORT Server port for launch (default 8765)
  WA_RUN_ID      Optional run id for launch
`);
  process.exit(code);
}

function statePaths() {
  const dir = DEFAULT_STATE_DIR;
  return {
    dir,
    meta: join(dir, "meta.json"),
    serverLog: join(dir, "server.log"),
    browser: join(dir, "browser.json"),
    sock: join(dir, "browser.sock"),
  };
}

function fail(msg, code = 1) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function ok(obj) {
  process.stdout.write(
    typeof obj === "string" ? `${obj}\n` : `${JSON.stringify(obj, null, 2)}\n`
  );
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readMeta() {
  const { meta } = statePaths();
  if (!existsSync(meta)) {
    fail(`No verification instance meta at ${meta}. Run launch first.`);
  }
  return JSON.parse(readFileSync(meta, "utf8"));
}

function writeMeta(data) {
  const paths = statePaths();
  mkdirSync(paths.dir, { recursive: true });
  writeFileSync(paths.meta, `${JSON.stringify(data, null, 2)}\n`);
}

function unlinkQuiet(p) {
  try {
    if (existsSync(p)) unlinkSync(p);
  } catch {
    /* ignore */
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForPort(host, port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolveWait, reject) => {
    const tryOnce = () => {
      const socket = createConnection({ host, port }, () => {
        socket.end();
        resolveWait();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryOnce, 150);
      });
    };
    tryOnce();
  });
}

async function httpGet(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { status: res.status, text };
}

async function cmdLaunch(args) {
  const port = Number(args.port || DEFAULT_PORT);
  const runId = String(
    args["run-id"] || process.env.WA_RUN_ID || `run-${Date.now()}`
  );
  const host = "127.0.0.1";
  const bindHost = "0.0.0.0";
  const url = `http://${host}:${port}/`;
  const paths = statePaths();

  if (existsSync(paths.meta)) {
    const existing = JSON.parse(readFileSync(paths.meta, "utf8"));
    if (isAlive(existing.serverPid)) {
      fail(
        `A verification instance is already running (pid ${existing.serverPid}, ${existing.url}). Run cleanup first.`
      );
    }
  }

  mkdirSync(paths.dir, { recursive: true });
  mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  writeFileSync(paths.serverLog, "");
  const logFd = openSync(paths.serverLog, "a");

  const child = spawn("python3", [join(REPO_ROOT, "serve.py")], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: String(port), HOST: bindHost },
    stdio: ["ignore", logFd, logFd],
    detached: true,
  });
  child.unref();
  closeSync(logFd);

  try {
    await waitForPort(host, port);
  } catch (err) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    fail(err.message);
  }

  await sleep(200);
  if (!isAlive(child.pid)) {
    const logTail = existsSync(paths.serverLog)
      ? readFileSync(paths.serverLog, "utf8").trim().slice(-800)
      : "";
    fail(
      `serve.py exited immediately after bind (pid ${child.pid}). Often the port is already taken.${logTail ? `\n${logTail}` : ""}`
    );
  }

  const probe = await httpGet(url);
  if (probe.status !== 200 || !probe.text.includes("World Adventures")) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    fail(`Server responded ${probe.status} without World Adventures markup`);
  }

  const meta = {
    runId,
    url,
    host,
    port,
    bindHost,
    serverPid: child.pid,
    repoRoot: REPO_ROOT,
    startedAt: new Date().toISOString(),
    artifactsRoot: ARTIFACTS_ROOT,
  };
  writeMeta(meta);
  ok(meta);
}

async function cmdDoctor() {
  const meta = readMeta();
  const checks = [];

  const alive = isAlive(meta.serverPid);
  checks.push({
    name: "server-process",
    ok: alive,
    detail: `pid ${meta.serverPid}`,
  });
  if (!alive) {
    ok({ healthy: false, url: meta.url, checks });
    process.exit(2);
  }

  let httpOk = false;
  let titleOk = false;
  let detail = "";
  try {
    const probe = await httpGet(meta.url);
    httpOk = probe.status === 200;
    titleOk = probe.text.includes("<title>World Adventures!</title>");
    detail = `status ${probe.status}`;
  } catch (err) {
    detail = err.message;
  }
  checks.push({ name: "http", ok: httpOk, detail });
  checks.push({
    name: "document-title",
    ok: titleOk,
    detail: "World Adventures!",
  });
  checks.push({
    name: "port-owned-by-us",
    ok: alive && httpOk,
    detail: `${meta.host}:${meta.port}`,
  });

  const healthy = checks.every((c) => c.ok);
  ok({
    healthy,
    url: meta.url,
    runId: meta.runId,
    artifactsRoot: meta.artifactsRoot,
    checks,
  });
  if (!healthy) process.exit(2);
}

function resolveArtifactPath(pathArg) {
  if (!pathArg) fail("Missing --path");
  if (pathArg.startsWith("/")) return pathArg;
  return resolve(ARTIFACTS_ROOT, pathArg);
}

function rpcCall(payload, timeoutMs = 90000) {
  const { sock } = statePaths();
  return new Promise((resolveRpc, reject) => {
    const client = createConnection(sock);
    let buf = "";
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error(`browser daemon timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    client.on("connect", () => {
      client.write(`${JSON.stringify(payload)}\n`);
    });
    client.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl === -1) return;
      clearTimeout(timer);
      client.end();
      try {
        resolveRpc(JSON.parse(buf.slice(0, nl)));
      } catch (err) {
        reject(err);
      }
    });
    client.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function ensureDaemon() {
  const paths = statePaths();
  const meta = readMeta();
  mkdirSync(paths.dir, { recursive: true });

  if (existsSync(paths.browser)) {
    try {
      const saved = JSON.parse(readFileSync(paths.browser, "utf8"));
      if (saved.pid && isAlive(saved.pid) && existsSync(paths.sock)) {
        const ping = await rpcCall({ action: "ping" }, 5000);
        if (ping && ping.ok) return meta;
      }
    } catch {
      /* restart below */
    }
  }

  unlinkQuiet(paths.sock);
  unlinkQuiet(paths.browser);

  const child = spawn(
    process.execPath,
    [SELF, "_browser-daemon"],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, WA_STATE_DIR: paths.dir },
      stdio: "ignore",
      detached: true,
    }
  );
  child.unref();

  const start = Date.now();
  while (Date.now() - start < 60000) {
    if (existsSync(paths.sock) && existsSync(paths.browser)) {
      try {
        const ping = await rpcCall({ action: "ping" }, 5000);
        if (ping && ping.ok) return meta;
      } catch {
        /* retry */
      }
    }
    await sleep(200);
  }
  fail("Timed out starting browser daemon");
}

async function runBrowserAction(action, args) {
  if (action === "ready") {
    return rpcCall({ action: "ready" });
  }
  if (action === "click") {
    if (args.selector) return rpcCall({ action: "click", selector: args.selector });
    if (args.role && args.name) {
      return rpcCall({ action: "click", role: args.role, name: args.name });
    }
    fail("click requires --selector or --role and --name");
  }
  if (action === "wait") {
    if (!args.selector) fail("wait requires --selector");
    return rpcCall({
      action: "wait",
      selector: args.selector,
      state: args.state || "visible",
    });
  }
  if (action === "text") {
    if (!args.selector) fail("text requires --selector");
    return rpcCall({ action: "text", selector: args.selector });
  }
  if (action === "eval") {
    if (!args.js) fail("eval requires --js");
    return rpcCall({ action: "eval", js: args.js });
  }
  if (action === "snapshot") {
    if (!args.aria) fail("snapshot currently supports --aria only");
    return rpcCall({
      action: "snapshot",
      path: resolveArtifactPath(args.path),
    });
  }
  if (action === "screenshot") {
    return rpcCall({
      action: "screenshot",
      path: resolveArtifactPath(args.path),
    });
  }
  fail(`Unknown browser action: ${action}`);
}

async function cmdBrowser(args) {
  const action = args._[1];
  if (!action) usage(1);
  await ensureDaemon();
  const result = await runBrowserAction(action, args);
  if (result && result.error) fail(result.error);
  ok(result);
}

async function captureAria(page) {
  return page.evaluate(() => {
    const lines = [];
    const push = (indent, role, name, extra = "") => {
      const label = name ? `: ${name}` : "";
      lines.push(`${"  ".repeat(indent)}${role}${label}${extra}`);
    };
    const h1 = document.querySelector("h1");
    if (h1) push(0, "heading", h1.textContent.trim(), " [level=1]");
    document.querySelectorAll('[role="tab"]').forEach((el) => {
      push(
        0,
        "tab",
        el.getAttribute("aria-label") || el.textContent.trim(),
        el.getAttribute("aria-selected") === "true" ? " [selected]" : ""
      );
    });
    const globe = document.querySelector('#globeViz[role="application"]');
    if (globe) push(0, "application", globe.getAttribute("aria-label") || "");
    const solar = document.querySelector("#solarSystem");
    if (solar && !solar.hidden) {
      push(0, "region", solar.getAttribute("aria-label") || "solar system");
    }
    const card = document.querySelector("#card");
    if (card && !card.hidden) {
      push(
        0,
        "dialog",
        document.querySelector("#cardTitle")?.textContent?.trim() || "card"
      );
      const place = document.querySelector("#cardPlace")?.textContent?.trim();
      if (place) push(1, "text", place);
      const story = document.querySelector("#cardStory")?.textContent?.trim();
      if (story) push(1, "text", story.slice(0, 120));
      document.querySelectorAll(".card-actions .btn").forEach((btn) => {
        if (btn.hidden) return;
        push(1, "button", btn.textContent.replace(/\s+/g, " ").trim());
      });
    }
    const findPrompt = document.querySelector("#findPrompt");
    if (findPrompt && !findPrompt.hidden) {
      push(0, "region", "Find prompt");
      const cue = document.querySelector("#findCue")?.textContent?.trim();
      if (cue) push(1, "text", cue);
      const emoji = document.querySelector("#findEmoji")?.textContent?.trim();
      if (emoji) push(1, "text", emoji);
    }
    const strip = [...document.querySelectorAll("#strip .thumb")].slice(0, 8);
    if (strip.length) {
      push(0, "region", "Place shortcuts");
      strip.forEach((t) =>
        push(
          1,
          "button",
          t.title || t.textContent.trim(),
          t.classList.contains("active") ? " [active]" : ""
        )
      );
    }
    return lines.join("\n");
  });
}

async function handleDaemonRequest(page, req) {
  const { action } = req;
  if (action === "ping") return { ok: true };
  if (action === "ready") {
    await page.waitForFunction(
      () => document.getElementById("loader")?.classList.contains("hide"),
      { timeout: 60000 }
    );
    await page.waitForSelector("#strip .thumb", { timeout: 30000 });
    const brand = await page.locator("h1").innerText();
    const strip = await page.locator("#strip .thumb").count();
    return { ready: true, brand, stripThumbs: strip };
  }
  if (action === "click") {
    if (req.selector) {
      await page.locator(req.selector).first().click({ timeout: 15000 });
      return { clicked: req.selector };
    }
    await page
      .getByRole(req.role, { name: req.name })
      .first()
      .click({ timeout: 15000 });
    return { clicked: { role: req.role, name: req.name } };
  }
  if (action === "wait") {
    await page.waitForSelector(req.selector, {
      state: req.state || "visible",
      timeout: 30000,
    });
    return { waited: req.selector, state: req.state || "visible" };
  }
  if (action === "text") {
    const text = await page.locator(req.selector).first().innerText({
      timeout: 15000,
    });
    return { selector: req.selector, text: text.trim() };
  }
  if (action === "eval") {
    const value = await page.evaluate(req.js);
    return { value };
  }
  if (action === "snapshot") {
    mkdirSync(dirname(req.path), { recursive: true });
    const snapshot = await captureAria(page);
    writeFileSync(req.path, `${snapshot}\n`);
    return { path: req.path, bytes: Buffer.byteLength(snapshot) };
  }
  if (action === "screenshot") {
    mkdirSync(dirname(req.path), { recursive: true });
    await page.screenshot({ path: req.path, fullPage: false });
    return { path: req.path };
  }
  if (action === "shutdown") {
    return { shutdown: true };
  }
  return { error: `Unknown daemon action: ${action}` };
}

async function runBrowserDaemon() {
  const paths = statePaths();
  const meta = readMeta();
  unlinkQuiet(paths.sock);

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(meta.url, { waitUntil: "domcontentloaded", timeout: 60000 });

  writeFileSync(
    paths.browser,
    `${JSON.stringify({ pid: process.pid, sock: paths.sock }, null, 2)}\n`
  );

  const server = createServer((socket) => {
    let buf = "";
    socket.on("data", async (chunk) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl === -1) return;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      let req;
      try {
        req = JSON.parse(line);
      } catch (err) {
        socket.write(`${JSON.stringify({ error: err.message })}\n`);
        return;
      }
      try {
        const result = await handleDaemonRequest(page, req);
        socket.write(`${JSON.stringify(result)}\n`);
        if (req.action === "shutdown") {
          socket.end();
          server.close();
          await browser.close();
          process.exit(0);
        }
      } catch (err) {
        socket.write(
          `${JSON.stringify({ error: err.stack || err.message })}\n`
        );
      }
    });
  });

  server.listen(paths.sock);
  // Keep alive.
  process.on("SIGTERM", async () => {
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
    unlinkQuiet(paths.sock);
    process.exit(0);
  });
}

async function cmdCleanup() {
  const paths = statePaths();
  const result = {
    killedServer: false,
    killedBrowser: false,
    evidenceKept: ARTIFACTS_ROOT,
  };

  if (existsSync(paths.browser) && existsSync(paths.sock)) {
    try {
      await rpcCall({ action: "shutdown" }, 5000);
      result.killedBrowser = true;
      await sleep(200);
    } catch {
      /* fall through to kill */
    }
  }

  if (existsSync(paths.browser)) {
    try {
      const saved = JSON.parse(readFileSync(paths.browser, "utf8"));
      if (saved.pid && isAlive(saved.pid)) {
        process.kill(saved.pid, "SIGTERM");
        result.killedBrowser = true;
        await sleep(200);
        if (isAlive(saved.pid)) process.kill(saved.pid, "SIGKILL");
      }
    } catch {
      /* ignore */
    }
    unlinkQuiet(paths.browser);
  }
  unlinkQuiet(paths.sock);

  if (existsSync(paths.meta)) {
    try {
      const meta = JSON.parse(readFileSync(paths.meta, "utf8"));
      if (meta.serverPid && isAlive(meta.serverPid)) {
        process.kill(meta.serverPid, "SIGTERM");
        result.killedServer = true;
        await sleep(300);
        if (isAlive(meta.serverPid)) process.kill(meta.serverPid, "SIGKILL");
      }
    } catch {
      /* ignore */
    }
    unlinkQuiet(paths.meta);
  }

  unlinkQuiet(paths.serverLog);
  ok(result);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === "help" || args.help) usage(cmd ? 0 : 1);

  if (cmd === "_browser-daemon") return runBrowserDaemon();
  if (cmd === "launch") return cmdLaunch(args);
  if (cmd === "doctor") return cmdDoctor();
  if (cmd === "browser") return cmdBrowser(args);
  if (cmd === "cleanup") return cmdCleanup();
  usage(1);
}

main().catch((err) => {
  fail(err.stack || err.message);
});
