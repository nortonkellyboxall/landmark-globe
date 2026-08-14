import { shouldEnterSpace } from "./orbit-look.js";

export function planetDisplayPx(km, jupKm, maxPx) {
  return Math.max(8, Math.round((km / jupKm) * maxPx));
}

export function createSpaceMode(opts) {
  const els = opts.els;
  let spaceTransitioning = false;
  let spacePinchArmed = false;
  let Solar3D = null;
  let solar3dLoading = null;
  const loadSolar3D = opts.loadSolar3D || (() => import("./solar3d.js"));

  function armPinch() { spacePinchArmed = true; }
  function shouldHandoff(alt) {
    return shouldEnterSpace(alt, spacePinchArmed)
      && opts.getTab() !== "space"
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
    const jupKm = opts.spaceDiameterKm("jupiter");
    const maxPlanetPx = 54;
    const sunMaxPx = 70;

    items.forEach((obj) => {
      const km = opts.spaceDiameterKm(obj);
      const px = obj.kind === "star" ? sunMaxPx : planetDisplayPx(km, jupKm, maxPlanetPx);

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
    return loadSolar3DModule().catch(() => {});
  }

  async function ensure(ensureOpts) {
    if (!els.ss3d) return;
    const introZoom = !!(ensureOpts && ensureOpts.introZoom);
    try {
      await loadSolar3DModule();
    } catch (err) {
      console.warn("Solar3D failed to load", err);
      return;
    }
    if (!Solar3D) return;
    if (els.ss3d.dataset.ready === "1") {
      Solar3D.resize();
      Solar3D.setActive(true);
      if (introZoom && Solar3D.playIntroZoom) Solar3D.playIntroZoom();
      return;
    }
    Solar3D.init(els.ss3d, {
      introZoom,
      onSelect: (id) => {
        const obj = (opts.getSpaceItems() || []).find((p) => p.id === id);
        if (!obj) return;
        opts.onSelect(id);
        const rect = els.ss3d.getBoundingClientRect();
        opts.sparkAt(rect.left + rect.width / 2, rect.top + rect.height * 0.4);
      },
    });
    els.ss3d.dataset.ready = "1";
  }

  function highlight(id) {
    if (Solar3D) Solar3D.highlight(id);
  }

  function resize() {
    if (Solar3D) Solar3D.resize();
  }

  function enter() {
    if (spaceTransitioning) return;
    opts.stopFind();
    spaceTransitioning = true;
    spacePinchArmed = false;
    document.body.classList.add("space-mode");
    els.solarSystem.hidden = false;
    if (els.nightBtn) els.nightBtn.style.display = "none";
    if (els.autoNightBtn) els.autoNightBtn.style.display = "none";
    if (els.sunBtn) els.sunBtn.hidden = true;
    opts.playFlyWhoosh();
    opts.setAmbient();
    setSizesOpen(true);

    const reduce = opts.matchReduce();
    const globe = opts.getGlobe();
    const pov = globe ? globe.pointOfView() || {} : {};
    const outAlt = 12.6;
    const ms = reduce ? 180 : Math.max(1600, opts.diveMs(pov.altitude, outAlt));

    if (globe) {
      globe.setAutoRotate(false);
      globe.setPlaces([]);
      globe.setWeather();
      globe.pointOfView(pov.lat || 12, pov.lng || 20, outAlt, ms);
    }

    const primed = ensure({ introZoom: false })
      .then(() => {
        if (Solar3D) {
          Solar3D.setActive(true);
          Solar3D.resize();
          if (Solar3D.frameEarth) Solar3D.frameEarth();
        }
      })
      .catch(() => {});

    setTimeout(() => {
      primed.then(() => {
        els.solarSystem.classList.add("show");
        els.globeViz.classList.add("hidden-view");
        if (els.globeShadow) els.globeShadow.classList.add("hidden-view");
        if (Solar3D && Solar3D.playIntroZoom && !reduce) Solar3D.playIntroZoom();
        setTimeout(() => {
          if (globe) globe.setActive(false);
          spaceTransitioning = false;
        }, reduce ? 0 : 900);
      });
    }, reduce ? 0 : Math.round(ms * 0.7));
  }

  function leave() {
    spaceTransitioning = true;
    spacePinchArmed = false;
    opts.playFlyWhoosh();
    const reduce = opts.matchReduce();
    const inbound = reduce || !Solar3D || !Solar3D.zoomToEarth
      ? Promise.resolve()
      : Solar3D.zoomToEarth(1500);

    return inbound.then(() => {
      document.body.classList.remove("space-mode");
      if (els.nightBtn) els.nightBtn.style.display = "";
      if (els.sunBtn) els.sunBtn.hidden = false;
      if (els.autoNightBtn) els.autoNightBtn.style.display = "";
      const globe = opts.getGlobe();
      if (globe) {
        globe.setActive(true);
        globe.setNight(opts.getNightMode());
        const pov = globe.pointOfView() || {};
        globe.pointOfView(pov.lat || 18, pov.lng || -18, 11, 0);
      }
      els.globeViz.classList.remove("hidden-view");
      if (els.globeShadow) els.globeShadow.classList.remove("hidden-view");
      els.solarSystem.classList.remove("show");
      setTimeout(() => {
        if (opts.getTab() !== "space") {
          els.solarSystem.hidden = true;
          if (Solar3D) Solar3D.setActive(false);
        }
        spaceTransitioning = false;
        spacePinchArmed = true;
      }, 800);
    });
  }

  return {
    isTransitioning: () => spaceTransitioning,
    isPinchArmed: () => spacePinchArmed,
    armPinch,
    shouldHandoff,
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
  };
}
