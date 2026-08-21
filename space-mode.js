import { shouldEnterSpace, shouldLeaveSpace } from "./orbit-look.js";

/**
 * Ball diameter for the Space size chart.
 * Square-root scale vs Earth keeps Moon visibly smaller, preserves Jupiter > Saturn,
 * and fits giants without clamping both to the same max.
 * @param {number} km
 * @param {number} earthKm
 * @param {number} [earthPx=26]
 * @param {number} [maxPx=96]
 * @param {number} [minPx=7]
 */
export function planetDisplayPx(km, earthKm, earthPx = 26, maxPx = 96, minPx = 7) {
  if (!Number.isFinite(km) || km <= 0 || !Number.isFinite(earthKm) || earthKm <= 0) {
    return minPx;
  }
  const px = earthPx * Math.sqrt(km / earthKm);
  return Math.max(minPx, Math.min(maxPx, Math.round(px)));
}

export function createSpaceMode(opts) {
  const els = opts.els;
  let spaceTransitioning = false;
  let spacePinchArmed = false;
  let Solar3D = null;
  let solar3dLoading = null;
  const loadSolar3D = opts.loadSolar3D || (() => import("./solar3d.js"));

  /** True once the camera has been past handoff in this Space visit (enables zoom-back). */
  let wasDeepSpace = false;

  function armPinch() { spacePinchArmed = true; }
  function shouldHandoff(alt) {
    return shouldEnterSpace(alt, spacePinchArmed)
      && opts.getTab() !== "space"
      && !spaceTransitioning;
  }
  function shouldReturn(alt) {
    if (shouldEnterSpace(alt, true)) wasDeepSpace = true;
    return wasDeepSpace
      && shouldLeaveSpace(alt, opts.getTab() === "space")
      && !spaceTransitioning;
  }

  function bindSpacePick(el, obj) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      opts.sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      opts.onSelect(obj.id);
    });
  }

  function buildSizes() {
    if (!els.ssSizesRow) return;
    els.ssSizesRow.innerHTML = "";
    const items = (opts.getSpaceItems() || []).filter((o) =>
      o.kind === "star" || o.kind === "planet" || o.kind === "moon"
    );
    const earthKm = opts.spaceDiameterKm("earth");
    const earthPx = 26;
    const maxPlanetPx = 96;
    const sunMaxPx = 84;

    items.forEach((obj) => {
      const km = opts.spaceDiameterKm(obj);
      const px =
        obj.kind === "star"
          ? sunMaxPx
          : planetDisplayPx(km, earthKm, earthPx, maxPlanetPx);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ss-size-item" + (obj.kind === "star" ? " sun" : "") + (obj.id === "saturn" ? " saturn" : "");
      btn.dataset.id = obj.id;
      btn.setAttribute("aria-label", obj.name + " size comparison");

      const ball = document.createElement("span");
      ball.className = "ss-size-ball";
      ball.style.width = px + "px";
      ball.style.height = px + "px";
      ball.style.setProperty("--ball", obj.color);

      const name = document.createElement("span");
      name.className = "ss-size-name";
      name.textContent = obj.name.replace(/^The /, "");

      const meta = document.createElement("span");
      meta.className = "ss-size-meta";
      if (obj.kind === "star") {
        meta.textContent = "Much bigger!";
      } else if (obj.id === "earth") {
        meta.textContent = "Our home";
      } else {
        const ratio = km / opts.spaceDiameterKm("earth");
        meta.textContent = ratio >= 1
          ? (Math.round(ratio * 10) / 10) + "× Earth"
          : Math.round(ratio * 100) + "% Earth";
      }

      btn.appendChild(ball);
      btn.appendChild(name);
      btn.appendChild(meta);
      bindSpacePick(btn, obj);
      els.ssSizesRow.appendChild(btn);
    });
  }

  function setSizesOpen(open) {
    if (!els.ssSizesPanel) return;
    els.ssSizesPanel.classList.toggle("open", open);
    if (els.ssViewIso) els.ssViewIso.classList.toggle("with-sizes", open);
    if (els.ssSizesToggle) {
      els.ssSizesToggle.setAttribute("aria-expanded", String(open));
      els.ssSizesToggle.setAttribute("aria-label", open ? "Hide planet sizes" : "Show planet sizes");
    }
    if (Solar3D) requestAnimationFrame(() => Solar3D.resize());
  }

  function toggleSizes() {
    if (!els.ssSizesPanel) return;
    setSizesOpen(!els.ssSizesPanel.classList.contains("open"));
  }

  function loadSolar3DModule() {
    if (Solar3D) return Promise.resolve(Solar3D);
    if (solar3dLoading) return solar3dLoading;
    solar3dLoading = loadSolar3D().then((mod) => {
      Solar3D = mod;
      return Solar3D;
    });
    return solar3dLoading;
  }

  function preload() {
    return loadSolar3DModule()
      .then((mod) => {
        if (mod && typeof mod.warmTextures === "function") mod.warmTextures();
      })
      .catch(() => {});
  }

  async function ensure(ensureOpts) {
    const host = els.globeViz || els.ss3d;
    if (!host) return;
    const introZoom = !!(ensureOpts && ensureOpts.introZoom);
    try {
      await loadSolar3DModule();
    } catch (err) {
      console.warn("Solar3D failed to load", err);
      return;
    }
    if (!Solar3D) return;
    if (host.dataset.ready === "1" || (typeof Solar3D.isReady === "function" && Solar3D.isReady())) {
      host.dataset.ready = "1";
      Solar3D.resize();
      syncOrbitModeUi();
      return;
    }
    Solar3D.init(host, {
      introZoom,
      startActive: true,
      viewMode: "earth",
      onSelect: (id) => {
        const obj = (opts.getSpaceItems() || []).find((p) => p.id === id);
        if (!obj) return;
        opts.onSelect(id);
        const rect = host.getBoundingClientRect();
        opts.sparkAt(rect.left + rect.width / 2, rect.top + rect.height * 0.4);
      },
    });
    host.dataset.ready = "1";
    syncOrbitModeUi();
  }

  function syncOrbitModeUi() {
    if (!els.ssOrbitMode || !Solar3D || typeof Solar3D.getOrbitMode !== "function") return;
    const mode = Solar3D.getOrbitMode();
    const isReal = mode === "real";
    els.ssOrbitMode.setAttribute("aria-pressed", String(isReal));
    els.ssOrbitMode.textContent = isReal ? "Real orbits" : "√ relative orbits";
    els.ssOrbitMode.title = isReal
      ? "Showing real AU spacing — tap for playful √ relative orbits"
      : "Showing √ relative orbits — tap for real AU spacing";
  }

  function setOrbitMode(mode) {
    return loadSolar3DModule().then((mod) => {
      if (!mod || typeof mod.setOrbitMode !== "function") return "real";
      const next = mod.setOrbitMode(mode);
      syncOrbitModeUi();
      return next;
    });
  }

  function toggleOrbitMode() {
    const cur =
      Solar3D && typeof Solar3D.getOrbitMode === "function"
        ? Solar3D.getOrbitMode()
        : "real";
    return setOrbitMode(cur === "real" ? "sqrt" : "real");
  }

  function highlight(id) {
    if (Solar3D) Solar3D.highlight(id);
  }

  function resize() {
    if (Solar3D) Solar3D.resize();
  }

  function enter(enterOpts = {}) {
    if (spaceTransitioning) return;
    const overview = !!enterOpts.overview;
    const quiet = !overview;
    opts.stopFind();
    spaceTransitioning = true;
    spacePinchArmed = false;
    document.body.classList.add("space-mode");
    els.solarSystem.hidden = false;
    if (els.nightBtn) els.nightBtn.style.display = "none";
    if (els.autoNightBtn) els.autoNightBtn.style.display = "none";
    if (els.sunBtn) els.sunBtn.hidden = true;
    if (!quiet) opts.playFlyWhoosh();
    opts.setAmbient();
    setSizesOpen(true);

    const reduce = opts.matchReduce();
    const globe = opts.getGlobe();
    if (globe) {
      globe.setAutoRotate(false);
      globe.setPlaces([]);
      globe.setWeather();
    }

    const primed = ensure({ introZoom: false }).catch(() => {});

    primed
      .then(() => {
        if (Solar3D) {
          Solar3D.resize();
          if (typeof Solar3D.setViewMode !== "function") return;
          if (overview) {
            return Solar3D.setViewMode("solar", { animate: !reduce, reduce });
          }
          // Pinch zoom: keep camera, open range into the system.
          return Solar3D.setViewMode("solar", { fluid: true });
        }
      })
      .then(() => {
        els.solarSystem.classList.add("show");
        if (els.globeShadow) els.globeShadow.classList.add("hidden-view");
        spaceTransitioning = false;
      });
  }

  function leave(leaveOpts = {}) {
    spaceTransitioning = true;
    spacePinchArmed = false;
    wasDeepSpace = false;
    const quiet = !!(leaveOpts && leaveOpts.quiet);
    if (!quiet) opts.playFlyWhoosh();
    const inbound = !Solar3D
      ? Promise.resolve()
      : typeof Solar3D.setViewMode === "function"
        ? Solar3D.setViewMode("earth", { fluid: true })
        : Promise.resolve();

    return inbound.then(() => {
      document.body.classList.remove("space-mode");
      if (els.nightBtn) els.nightBtn.style.display = "";
      if (els.sunBtn) els.sunBtn.hidden = false;
      if (els.autoNightBtn) els.autoNightBtn.style.display = "";
      const globe = opts.getGlobe();
      if (globe) globe.setNight(opts.getNightMode());
      if (els.globeShadow) els.globeShadow.classList.remove("hidden-view");
      els.solarSystem.classList.remove("show");
      setTimeout(() => {
        if (opts.getTab() !== "space") {
          els.solarSystem.hidden = true;
        }
        spaceTransitioning = false;
        spacePinchArmed = true;
      }, 400);
    });
  }

  return {
    isTransitioning: () => spaceTransitioning,
    isPinchArmed: () => spacePinchArmed,
    armPinch,
    shouldHandoff,
    shouldReturn,
    planetDisplayPx,
    enter,
    leave,
    buildSizes,
    setSizesOpen,
    toggleSizes,
    highlight,
    preload,
    ensure,
    resize,
    setOrbitMode,
    toggleOrbitMode,
  };
}
