/** Globe — Earth view adapter over globe.gl. Callers never touch materials/scene. */

const DEFAULT_TEXTURES = {
  day: "textures/earth/earth-blue-marble.jpg",
  bump: "textures/earth/earth-topology.png",
  clouds:
    "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-clouds.png",
  night: "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-night.jpg",
};

/**
 * @param {HTMLElement} el
 * @param {{
 *   onSelect?: (id: string, sourceEl?: HTMLElement) => void,
 *   sparkAt?: (x: number, y: number) => void,
 *   onReady?: () => void,
 *   hasSelection?: () => boolean,
 *   places?: object[],
 * }} opts
 */
export function createGlobe(el, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const sparkAt = opts.sparkAt || (() => {});
  const onReady = opts.onReady || (() => {});
  const hasSelection = opts.hasSelection || (() => false);
  const textures = DEFAULT_TEXTURES;

  const GlobeCtor = typeof Globe !== "undefined" ? Globe : globalThis.Globe;
  if (!GlobeCtor) {
    throw new Error("globe.gl Globe() missing — load vendor/globe.gl.min.js first");
  }

  let nightMode = false;
  let sunDirLight = null;
  let cloudsMesh = null;
  let cloudsRaf = 0;
  let engineActive = true;
  let resumeTimer = null;
  let ready = false;
  let places = opts.places || [];

  function markReady() {
    if (ready) return;
    ready = true;
    onReady();
  }

  function createPin(lm, index) {
    const pinEl = document.createElement("button");
    pinEl.type = "button";
    pinEl.className = "pin" + (index < 4 ? " pin-bounce" : "");
    pinEl.dataset.id = lm.id;
    pinEl.setAttribute("aria-label", lm.name);
    pinEl.style.setProperty("--pin-color", lm.color === "#ffffff" ? "#dfe7ee" : lm.color);
    pinEl.style.setProperty("--delay", (index % 8) * 0.18 + "s");
    pinEl.innerHTML = `
      <span class="pin-inner">
        <span class="pin-glow"></span>
        <span class="pin-emoji">${lm.emoji}</span>
      </span>
    `;
    pinEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = pinEl.getBoundingClientRect();
      sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      onSelect(lm.id, pinEl);
    });
    return pinEl;
  }

  function stopClouds() {
    if (cloudsRaf) {
      cancelAnimationFrame(cloudsRaf);
      cloudsRaf = 0;
    }
  }

  function startClouds() {
    if (!cloudsMesh || !engineActive || cloudsRaf) return;
    (function rotateClouds() {
      if (!cloudsMesh || !engineActive) {
        cloudsRaf = 0;
        return;
      }
      cloudsMesh.rotation.y += 0.0004;
      cloudsRaf = requestAnimationFrame(rotateClouds);
    })();
  }

  function applyNightVisuals() {
    world.globeImageUrl(nightMode ? textures.night : textures.day);
    world.atmosphereColor(nightMode ? "#1b3a6b" : "#7ec8e3");
    world.atmosphereAltitude(nightMode ? 0.22 : 0.18);
    if (sunDirLight) {
      sunDirLight.intensity = nightMode ? 0.55 : 1.35;
      sunDirLight.color.set(nightMode ? 0x9eb7ff : 0xfff2d6);
    }
    if (cloudsMesh && cloudsMesh.material) {
      cloudsMesh.material.opacity = nightMode ? 0.18 : 0.45;
      cloudsMesh.visible = !nightMode;
    }
    try {
      const mat = world.globeMaterial();
      const T = window.THREE;
      if (mat && T) {
        if (!mat.emissive) mat.emissive = new T.Color(0x000000);
        mat.emissiveIntensity = nightMode ? 0.25 : 0.05;
      }
    } catch (_) {}
  }

  const world = GlobeCtor()(el)
    .globeImageUrl(textures.day)
    .bumpImageUrl(textures.bump)
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereColor("#7ec8e3")
    .atmosphereAltitude(0.18)
    .htmlElementsData(places)
    .htmlElement((d) => createPin(d, places.findIndex((p) => p.id === d.id)))
    .htmlAltitude(0.02)
    .htmlElementVisibilityModifier((pinEl, isVisible) => {
      pinEl.style.opacity = isVisible ? 1 : 0;
      pinEl.style.pointerEvents = isVisible ? "auto" : "none";
    });

  world.controls().enableDamping = true;
  world.controls().dampingFactor = 0.08;
  world.controls().minDistance = 140;
  world.controls().maxDistance = 520;
  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.45;
  world.pointOfView({ lat: 20, lng: 20, altitude: 2.2 }, 0);

  function pauseAutoRotateTemporarily() {
    setAutoRotate(false);
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!hasSelection()) setAutoRotate(true);
    }, 4000);
  }

  world.controls().addEventListener("start", pauseAutoRotateTemporarily);

  function resize() {
    world.width(el.clientWidth);
    world.height(el.clientHeight);
  }
  resize();
  window.addEventListener("resize", resize);

  const THREE = window.THREE;
  if (THREE) {
    sunDirLight = new THREE.DirectionalLight(0xfff2d6, 1.35);
    sunDirLight.position.set(-4, 1.2, 2.5);
    world.scene().add(sunDirLight);
    const fill = new THREE.AmbientLight(0x334455, 0.35);
    world.scene().add(fill);

    try {
      const mat = world.globeMaterial();
      if (mat) {
        mat.emissive = new THREE.Color(0x112233);
        mat.emissiveIntensity = 0.05;
      }
    } catch (_) {}

    new THREE.TextureLoader().load(
      textures.clouds,
      (cloudsTexture) => {
        cloudsMesh = new THREE.Mesh(
          new THREE.SphereGeometry(world.getGlobeRadius() * 1.01, 64, 64),
          new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true, opacity: 0.45 })
        );
        world.scene().add(cloudsMesh);
        if (nightMode) {
          cloudsMesh.material.opacity = 0.18;
          cloudsMesh.visible = false;
        }
        startClouds();
      },
      undefined,
      () => {}
    );
  }

  setTimeout(markReady, 1200);
  setTimeout(markReady, 5000);

  function setPlaces(nextPlaces) {
    places = nextPlaces || [];
    world.htmlElementsData(places).htmlElement((d) => createPin(d, places.findIndex((p) => p.id === d.id)));
  }

  function setNight(on) {
    nightMode = !!on;
    applyNightVisuals();
  }

  function setActive(active) {
    engineActive = !!active;
    if (engineActive) {
      if (typeof world.resumeAnimation === "function") world.resumeAnimation();
      world.controls().enabled = true;
      startClouds();
    } else {
      if (typeof world.pauseAnimation === "function") world.pauseAnimation();
      world.controls().enabled = false;
      stopClouds();
    }
  }

  function setAutoRotate(on) {
    world.controls().autoRotate = !!on;
    world.controls().autoRotateSpeed = 0.45;
  }

  /**
   * @param {number|undefined} lat omit all args to read current POV
   * @param {number} [lng]
   * @param {number} [altitude]
   * @param {number} [ms]
   */
  function pointOfView(lat, lng, altitude, ms) {
    if (arguments.length === 0) return world.pointOfView();
    return world.pointOfView({ lat, lng, altitude }, ms);
  }

  applyNightVisuals();

  return {
    setPlaces,
    setNight,
    setActive,
    setAutoRotate,
    pointOfView,
  };
}
