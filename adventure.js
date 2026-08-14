export function placesForContinent(continentId, landmarks, wonders) {
  const filterPack = (all) => {
    if (continentId === "northamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat >= 7);
    }
    if (continentId === "southamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat < 7);
    }
    const label = {
      africa: "Africa",
      asia: "Asia",
      europe: "Europe",
      oceania: "Oceania",
      antarctica: "Antarctica",
    }[continentId];
    if (!label) return [];
    return all.filter((l) => l.continent === label);
  };
  return [...filterPack(landmarks || []), ...filterPack(wonders || [])];
}

function staggerPinPlaces(items) {
  if (!items || items.length < 2) return items;
  // Nudge overlapping country/continent pins so taps are easier
  const out = items.map((it) => Object.assign({}, it));
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i];
      const b = out[j];
      if (a.lat == null || b.lat == null) continue;
      const dLat = a.lat - b.lat;
      const dLng = a.lng - b.lng;
      const dist = Math.hypot(dLat, dLng * Math.cos((a.lat * Math.PI) / 180));
      if (dist < 9) {
        const nudge = (10 - dist) * 0.35;
        const ang = Math.atan2(dLng || 0.01, dLat || 0.01) + i * 0.4;
        b.lat = Math.max(-80, Math.min(80, b.lat - Math.cos(ang) * nudge));
        b.lng = ((b.lng - Math.sin(ang) * nudge + 540) % 360) - 180;
      }
    }
  }
  return out;
}

/**
 * @param {{
 *   datasets: Record<string, { items: object[], label: string, hint: string, main: string }>,
 *   els: Record<string, object|null>,
 *   getGlobe: () => object|null,
 *   globeSetPlaces?: (items: object[]) => void,
 *   card: { close: () => void },
 *   stopFind: () => void,
 *   spaceEnter: () => void,
 *   spaceLeave: () => Promise<void>|void,
 *   diveMs: (fromAlt?: number, toAlt?: number) => number,
 *   setAmbient: () => void,
 *   playPop: () => void,
 *   setPanelOpen: (panel: object, btn: object, open: boolean) => void,
 *   onOpenPlace: (id: string, el?: object) => void,
 *   hideStickers: () => void,
 *   isFound?: (id: string) => boolean,
 * }} opts
 */
export function createAdventure(opts) {
  const datasets = opts.datasets;
  const els = opts.els;
  let activeTab = "landmarks";
  let places = datasets.landmarks.items;
  let selectedId = null;
  let landmarkFilter = null;

  function getGlobe() {
    return opts.getGlobe ? opts.getGlobe() : null;
  }

  function setGlobePlaces(items) {
    if (typeof opts.globeSetPlaces === "function") {
      opts.globeSetPlaces(items);
      return;
    }
    const globe = getGlobe();
    if (globe) globe.setPlaces(items);
  }

  function buildStrip() {
    if (!els.strip) return;
    els.strip.innerHTML = "";
    const doc = typeof globalThis.document !== "undefined" ? globalThis.document : undefined;
    if (!doc || typeof doc.createElement !== "function") return;
    places.forEach((lm) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "thumb" + (opts.isFound && opts.isFound(lm.id) ? " found" : "");
      btn.dataset.id = lm.id;
      btn.title = lm.name;
      btn.innerHTML = `<span class="te">${lm.emoji}</span><span class="tn">${lm.name}</span>`;
      btn.addEventListener("click", () => opts.onOpenPlace(lm.id, btn));
      els.strip.appendChild(btn);
    });
  }

  function syncStrip() {
    if (!els.strip || typeof els.strip.querySelectorAll !== "function") return;
    els.strip.querySelectorAll(".thumb").forEach((t) => {
      t.classList.toggle("active", t.dataset.id === selectedId);
      t.classList.toggle("found", !!(opts.isFound && opts.isFound(t.dataset.id)));
    });
  }

  function scrollStripToId(id) {
    if (!els.strip || typeof els.strip.querySelector !== "function") return;
    const thumb = els.strip.querySelector(`[data-id="${id}"]`);
    if (!thumb) return;
    const strip = els.strip;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    if (typeof globalThis.window !== "undefined" && globalThis.window.scrollTo) {
      globalThis.window.scrollTo(0, 0);
    }
  }

  function showPlacesInContinent(place) {
    const hits = placesForContinent(
      place.id,
      datasets.landmarks.items,
      datasets.wonders.items
    );
    if (!hits.length) return;
    opts.stopFind();
    landmarkFilter = place.id;
    opts.card.close();
    const leavingSpace = activeTab === "space";
    if (leavingSpace) opts.spaceLeave();
    activeTab = "landmarks";
    places = hits;

    els.tabLandmarks.classList.add("active");
    els.tabWonders.classList.remove("active");
    els.tabContinents.classList.remove("active");
    els.tabCountries.classList.remove("active");
    els.tabSpace.classList.remove("active");
    els.tabLandmarks.setAttribute("aria-selected", "true");
    els.tabWonders.setAttribute("aria-selected", "false");
    els.tabContinents.setAttribute("aria-selected", "false");
    els.tabCountries.setAttribute("aria-selected", "false");
    els.tabSpace.setAttribute("aria-selected", "false");
    els.exploreLabel.textContent = `✨ ${place.name}`;
    els.brandHint.textContent = place.name;
    opts.setPanelOpen(els.settingsPanel, els.settingsBtn, false);
    buildStrip();
    const globe = getGlobe();
    if (globe) {
      setGlobePlaces(places);
      const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
      const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
      globe.pointOfView(lat, lng, 1.65, leavingSpace ? 1100 : 900);
      globe.setAutoRotate(true);
    }
    opts.setAmbient();
    opts.playPop();
  }

  function switchTab(tab) {
    if (!datasets[tab] || (tab === activeTab && !(tab === "landmarks" && landmarkFilter))) return;
    opts.hideStickers();
    opts.stopFind();
    opts.card.close();
    if (tab === "landmarks") landmarkFilter = null;
    const leavingSpace = activeTab === "space";
    const enteringSpace = tab === "space";
    activeTab = tab;
    places = datasets[tab].items;

    els.tabLandmarks.classList.toggle("active", tab === "landmarks");
    els.tabWonders.classList.toggle("active", tab === "wonders");
    els.tabContinents.classList.toggle("active", tab === "continents");
    els.tabCountries.classList.toggle("active", tab === "countries");
    els.tabSpace.classList.toggle("active", tab === "space");
    els.tabLandmarks.setAttribute("aria-selected", String(tab === "landmarks"));
    els.tabWonders.setAttribute("aria-selected", String(tab === "wonders"));
    els.tabContinents.setAttribute("aria-selected", String(tab === "continents"));
    els.tabCountries.setAttribute("aria-selected", String(tab === "countries"));
    els.tabSpace.setAttribute("aria-selected", String(tab === "space"));

    els.exploreLabel.textContent = datasets[tab].label;
    els.brandHint.textContent = datasets[tab].hint;
    opts.setPanelOpen(els.settingsPanel, els.settingsBtn, false);

    buildStrip();

    const views = {
      landmarks: [20, 20, 2.2],
      wonders: [10, 30, 2.25],
      continents: [15, 20, 2.35],
      countries: [18, 12, 1.85],
    };

    function showEarthPins() {
      const globe = getGlobe();
      if (!globe || activeTab === "space") return;
      const pinData =
        activeTab === "countries" || activeTab === "continents" ? staggerPinPlaces(places) : places;
      setGlobePlaces(pinData);
      const v = views[activeTab] || views.landmarks;
      const from = (globe.pointOfView() || {}).altitude;
      globe.pointOfView(v[0], v[1], v[2], leavingSpace ? opts.diveMs(from, v[2]) : 900);
      globe.setAutoRotate(true);
      opts.setAmbient();
    }

    if (enteringSpace) {
      opts.spaceEnter();
    } else if (leavingSpace) {
      Promise.resolve(opts.spaceLeave()).then(showEarthPins);
    } else {
      showEarthPins();
    }
    opts.playPop();
  }

  return {
    switchTab,
    showPlacesInContinent,
    buildStrip,
    syncStrip,
    scrollStripToId,
    getTab: () => activeTab,
    getPlaces: () => places,
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    getLandmarkFilter: () => landmarkFilter,
  };
}
