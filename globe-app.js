/** Globe — Earth view adapter over globe.gl. Callers never touch materials/scene. */

import * as THREE from "three";
import {
  dueThisFrame,
  GLOBE_TICK,
  latLngDirection,
  lookFromAltitude,
  MOON_RADIUS,
  MOON_RADII_OUT,
  skyShowLook as terminatorLook,
  subsolarPoint,
  SUN_RADIUS,
  SUN_RADII_OUT,
  wrapLng,
} from "./orbit-look.js";
import { travelerPos } from "./traveler-orbit.js";

const DEFAULT_TEXTURES = {
  day: "textures/earth/earth-blue-marble.jpg",
  bump: "textures/earth/earth-topology.png",
  moon: "textures/planets/moon.jpg",
  clouds:
    "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-clouds.png",
  night: "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-night.jpg",
};

function paintSunCanvas() {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(s, s);
  const d = img.data;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      const gran = 0.35 + 0.65 * Math.abs(Math.sin(u * 51 + v * 19) * Math.cos(v * 41 + u * 13));
      const spot =
        Math.hypot(u - 0.38, v - 0.42) < 0.07 || Math.hypot(u - 0.7, v - 0.58) < 0.05 ? 0.55 : 1;
      const limb = 0.62 + 0.38 * Math.sin(v * Math.PI);
      const i = (y * s + x) * 4;
      d[i] = 255 * spot;
      d[i + 1] = Math.min(255, (120 + 110 * gran) * spot * limb);
      d[i + 2] = 8 + 36 * gran * spot;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function colorizeSphere(geo, canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pix = ctx.getImageData(0, 0, w, h).data;
  const uv = geo.attributes.uv;
  const cols = new Float32Array(uv.count * 3);
  for (let i = 0; i < uv.count; i++) {
    const x = Math.min(w - 1, Math.max(0, Math.floor(uv.getX(i) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor((1 - uv.getY(i)) * h)));
    const p = (y * w + x) * 4;
    cols[i * 3] = pix[p] / 255;
    cols[i * 3 + 1] = pix[p + 1] / 255;
    cols[i * 3 + 2] = pix[p + 2] / 255;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
}


/**
 * @param {HTMLElement} el
 * @param {{
 *   onSelect?: (id: string, sourceEl?: HTMLElement) => void,
 *   sparkAt?: (x: number, y: number) => void,
 *   onReady?: () => void,
 *   onPov?: (pov: { lat: number, lng: number, altitude: number }) => void,
 *   hasSelection?: () => boolean,
 *   isFound?: (id: string) => boolean,
 *   places?: object[],
 * }} opts
 */
export function createGlobe(el, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const sparkAt = opts.sparkAt || (() => {});
  const onReady = opts.onReady || (() => {});
  const onPov = opts.onPov || (() => {});
  const hasSelection = opts.hasSelection || (() => false);
  const isFound = opts.isFound || (() => false);
  const textures = DEFAULT_TEXTURES;

  const GlobeCtor = typeof Globe !== "undefined" ? Globe : globalThis.Globe;
  if (!GlobeCtor) {
    throw new Error("globe.gl Globe() missing — load vendor/globe.gl.min.js first");
  }

  let nightMode = false;
  let sunDirLight = null;
  let hemiLight = null;
  let fillLight = null;
  let cloudsMesh = null;
  let sunMesh = null;
  let sunGlow = null;
  let moonMesh = null;
  let auroraPoints = null;
  let auroraSeeds = [];
  let tickRaf = 0;
  let engineActive = true;
  let resumeTimer = null;
  let ready = false;
  let places = opts.places || [];
  let sunHours = 0;
  let lastTick = 0;
  let weatherDt = 0;
  let lookBand = "";
  let povFrame = 0;
  let weather = null;
  const traveler = {
    id: "iss",
    name: "Space station",
    emoji: "🛰️",
    color: "#dfe7ee",
    kind: "traveler",
    lat: 0,
    lng: 0,
  };

  function markReady() {
    if (ready) return;
    ready = true;
    onReady();
  }

  function pinList() {
    return places.length ? places.concat(traveler) : [];
  }

  function createPin(lm, index) {
    const pinEl = document.createElement("button");
    pinEl.type = "button";
    const travelerPin = lm.kind === "traveler";
    pinEl.className = "pin" + (travelerPin ? " pin-iss" : index < 4 ? " pin-bounce" : "");
    pinEl.dataset.id = lm.id;
    pinEl.setAttribute("aria-label", lm.name);
    pinEl.style.setProperty("--pin-color", lm.color === "#ffffff" ? "#dfe7ee" : lm.color);
    pinEl.style.setProperty("--delay", (index % 8) * 0.18 + "s");
    if (!travelerPin && isFound(lm.id)) pinEl.classList.add("found");
    pinEl.innerHTML = `
      <span class="pin-inner">
        <span class="pin-glow"></span>
        <span class="pin-emoji">${lm.emoji}</span>
      </span>
      <span class="pin-stamp" aria-hidden="true">⭐</span>
    `;
    pinEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = pinEl.getBoundingClientRect();
      sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      onSelect(lm.id, pinEl);
    });
    return pinEl;
  }

  function coords(lat, lng, alt) {
    if (typeof world.getCoords === "function") return world.getCoords(lat, lng, alt);
    const r = (typeof world.getGlobeRadius === "function" ? world.getGlobeRadius() : 100) * (1 + alt);
    const [x, y, z] = latLngDirection(lat, lng);
    return { x: x * r, y: y * r, z: z * r };
  }

  function globeR() {
    return typeof world.getGlobeRadius === "function" ? world.getGlobeRadius() : 100;
  }

  function applySun() {
    if (!sunDirLight) return;
    const when = new Date(Date.now() + sunHours * 3600000);
    const sun = subsolarPoint(when);
    const [dx, dy, dz] = latLngDirection(sun.lat, sun.lng);
    const R = globeR();
    const sunDist = R * SUN_RADII_OUT;
    const moonDist = R * MOON_RADII_OUT;
    sunDirLight.position.set(dx * sunDist, dy * sunDist, dz * sunDist);
    if (sunMesh) sunMesh.position.set(dx * sunDist, dy * sunDist, dz * sunDist);
    if (moonMesh) {
      moonMesh.position.set(-dx * moonDist, -dy * moonDist, -dz * moonDist);
      moonMesh.lookAt(0, 0, 0);
    }
  }

  function applyFill() {
    if (sunDirLight) {
      sunDirLight.intensity = nightMode ? 1.25 : 2.15;
      sunDirLight.color.set(nightMode ? 0xffe0b0 : 0xfff2d6);
    }
    if (hemiLight) hemiLight.intensity = nightMode ? 0.08 : 0.14;
    if (fillLight) fillLight.intensity = nightMode ? 0.04 : 0.07;
  }

  function applyLook(alt) {
    const look = lookFromAltitude(alt);
    if (look.band === lookBand) {
      world.controls().autoRotateSpeed = look.rotate;
      return;
    }
    lookBand = look.band;
    world.atmosphereColor(look.atmosphereColor);
    world.atmosphereAltitude(look.atmosphereAltitude);
    world.controls().autoRotateSpeed = look.rotate;
    if (cloudsMesh && cloudsMesh.material) {
      cloudsMesh.material.opacity = look.clouds;
      cloudsMesh.visible = look.clouds > 0.05;
    }
  }

  function stopTick() {
    if (tickRaf) {
      cancelAnimationFrame(tickRaf);
      tickRaf = 0;
    }
  }

  function startTick() {
    if (!engineActive || tickRaf) return;
    lastTick = performance.now();
    (function tick(now) {
      if (!engineActive) {
        tickRaf = 0;
        return;
      }
      const dt = Math.min(48, now - lastTick);
      lastTick = now;
      weatherDt += dt;
      if (dueThisFrame(povFrame, GLOBE_TICK.sun)) applySun();
      if (dueThisFrame(povFrame, GLOBE_TICK.weather)) {
        tickWeather(weatherDt);
        weatherDt = 0;
      }
      if (dueThisFrame(povFrame, GLOBE_TICK.aurora)) tickAurora(now);
      const next = travelerPos(now / 1000);
      traveler.lat = next.lat;
      traveler.lng = next.lng;
      if (cloudsMesh) cloudsMesh.rotation.y += 0.00045;
      if (sunMesh) sunMesh.rotation.y += 0.0006;
      const pov = world.pointOfView();
      if (pov) applyLook(pov.altitude);
      if (dueThisFrame(povFrame, GLOBE_TICK.pov) && pov) onPov(pov);
      povFrame += 1;
      tickRaf = requestAnimationFrame(tick);
    })(lastTick);
  }

  const world = GlobeCtor()(el)
    .globeImageUrl(textures.day)
    .bumpImageUrl(textures.bump)
    .backgroundColor("#02040c")
    .showAtmosphere(true)
    .atmosphereColor("#5ec8ff")
    .atmosphereAltitude(0.08)
    .htmlElementsData(pinList())
    .htmlElement((d) => createPin(d, places.findIndex((p) => p.id === d.id)))
    .htmlAltitude((d) => (d && d.kind === "traveler" ? 0.16 : 0.02));
  if (typeof world.htmlLat === "function") world.htmlLat("lat");
  if (typeof world.htmlLng === "function") world.htmlLng("lng");
  world.htmlElementVisibilityModifier((pinEl, isVisible) => {
      pinEl.style.opacity = isVisible ? "1" : "0";
      pinEl.style.pointerEvents = isVisible ? "auto" : "none";
    });

  const canRing = typeof world.ringsData === "function";

  world.controls().enableDamping = true;
  world.controls().dampingFactor = 0.08;
  world.controls().minDistance = 165;
  world.controls().maxDistance = 2400;
  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.18;
  world.pointOfView({ lat: 16, lng: -22, altitude: 10.4 }, 0);

  function pauseAutoRotateTemporarily(holdMs) {
    setAutoRotate(false);
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!hasSelection()) setAutoRotate(true);
    }, holdMs || 4000);
  }

  world.controls().addEventListener("start", () => pauseAutoRotateTemporarily(4000));

  function resize() {
    world.width(el.clientWidth);
    world.height(el.clientHeight);
  }
  resize();
  window.addEventListener("resize", resize);

  if (THREE) {
    sunDirLight = new THREE.DirectionalLight(0xfff2d6, 2.15);
    world.scene().add(sunDirLight);
    hemiLight = new THREE.HemisphereLight(0x9ecfff, 0x02040c, 0.14);
    world.scene().add(hemiLight);
    fillLight = new THREE.AmbientLight(0x1a2233, 0.07);
    world.scene().add(fillLight);

    const R = globeR();
    const cam = typeof world.camera === "function" ? world.camera() : null;
    if (cam) {
      cam.fov = 66;
      cam.far = Math.max(cam.far || 0, R * 80);
      cam.updateProjectionMatrix();
    }

    const sunGeo = new THREE.SphereGeometry(R * SUN_RADIUS, 48, 32);
    colorizeSphere(sunGeo, paintSunCanvas());
    sunMesh = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(R * SUN_RADIUS * 1.55, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffc14d,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    sunMesh.add(sunGlow);
    const moonGeo = new THREE.SphereGeometry(R * MOON_RADIUS, 48, 32);
    moonMesh = new THREE.Mesh(moonGeo, new THREE.MeshLambertMaterial({ color: 0xcfc8bc }));
    world.scene().add(sunMesh);
    world.scene().add(moonMesh);
    applySun();
    const moonImg = new Image();
    moonImg.onload = () => {
      const c = document.createElement("canvas");
      c.width = moonImg.width;
      c.height = moonImg.height;
      c.getContext("2d").drawImage(moonImg, 0, 0);
      colorizeSphere(moonGeo, c);
      moonMesh.material.vertexColors = true;
      moonMesh.material.color.set(0xffffff);
      moonMesh.material.needsUpdate = true;
    };
    moonImg.src = textures.moon;

    const CURTAINS = 11;
    const ALONG = 16;
    auroraSeeds = [];
    const auroraCol = [];
    for (let hem = 0; hem < 2; hem++) {
      const north = hem === 0;
      for (let c = 0; c < CURTAINS; c++) {
        const lngOff = -62 + (c / (CURTAINS - 1)) * 124;
        for (let a = 0; a < ALONG; a++) {
          const t = a / (ALONG - 1);
          auroraSeeds.push({
            north,
            lngOff: lngOff + (Math.random() - 0.5) * 5,
            lat0: (north ? 1 : -1) * (63.5 + t * 4 + (c % 3) * 0.8),
            alt0: 0.02 + t * 0.18,
            jitter: Math.random() * Math.PI * 2,
          });
          if (north) {
            auroraCol.push(0.25 + t * 0.2, 0.95, 0.45 + t * 0.4);
          } else {
            auroraCol.push(0.95, 0.35 + t * 0.25, 0.82 + t * 0.12);
          }
        }
      }
    }
    const auroraGeo = new THREE.BufferGeometry();
    auroraGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(auroraSeeds.length * 3), 3));
    auroraGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(auroraCol), 3));
    auroraPoints = new THREE.Points(
      auroraGeo,
      new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    world.scene().add(auroraPoints);
    tickAurora(0);

    applySun();

    const starGeo = new THREE.BufferGeometry();
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1600 + Math.random() * 1400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    world.scene().add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xe8f4ff, size: 1.15, sizeAttenuation: true })
      )
    );

    try {
      const mat = world.globeMaterial();
      if (mat) {
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.72;
      }
    } catch (_) {}

    new THREE.TextureLoader().load(
      textures.night,
      (nightTex) => {
        try {
          const mat = world.globeMaterial();
          if (!mat) return;
          if (THREE.SRGBColorSpace) nightTex.colorSpace = THREE.SRGBColorSpace;
          mat.emissiveMap = nightTex;
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 0.85;
          mat.needsUpdate = true;
        } catch (_) {}
      },
      undefined,
      () => {}
    );

    new THREE.TextureLoader().load(
      textures.clouds,
      (cloudsTexture) => {
        cloudsMesh = new THREE.Mesh(
          new THREE.SphereGeometry(world.getGlobeRadius() * 1.012, 64, 64),
          new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          })
        );
        world.scene().add(cloudsMesh);
      },
      undefined,
      () => {}
    );
  }

  startTick();
  setTimeout(markReady, 1200);
  setTimeout(markReady, 5000);

  function setPlaces(nextPlaces) {
    places = nextPlaces || [];
    world.htmlElementsData(pinList()).htmlElement((d) => createPin(d, places.findIndex((p) => p.id === d.id)));
  }

  function setNight(on) {
    nightMode = !!on;
    applyFill();
  }

  function setActive(active) {
    engineActive = !!active;
    if (engineActive) {
      if (typeof world.resumeAnimation === "function") world.resumeAnimation();
      world.controls().enabled = true;
      startTick();
    } else {
      if (typeof world.pauseAnimation === "function") world.pauseAnimation();
      world.controls().enabled = false;
      stopTick();
    }
  }

  function setAutoRotate(on) {
    world.controls().autoRotate = !!on;
  }

  /**
   * @param {number|undefined} lat omit all args to read current POV
   * @param {number} [lng]
   * @param {number} [altitude]
   * @param {number} [ms]
   */
  function pointOfView(lat, lng, altitude, ms) {
    if (arguments.length === 0) return world.pointOfView();
    if (ms > 400) pauseAutoRotateTemporarily(Math.max(4000, ms + 500));
    return world.pointOfView({ lat, lng, altitude }, ms);
  }

  function punch() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pov = world.pointOfView();
    if (!pov) return;
    const alt = pov.altitude || 2.2;
    world.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: Math.max(1.15, alt * 0.84) }, 260);
    setTimeout(() => {
      world.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: alt }, 520);
    }, 280);
  }

  /**
   * Find-game radar ping. Omit args to clear.
   * @param {number} [lat]
   * @param {number} [lng]
   */
  function lockRadar(lat, lng) {
    if (!canRing) return;
    try {
      if (lat == null || lng == null) {
        world.ringsData([]);
        return;
      }
      world
        .ringsData([{ lat, lng }])
        .ringColor(() => (t) => `rgba(255,200,87,${Math.max(0, 1 - t)})`)
        .ringMaxRadius(11)
        .ringPropagationSpeed(3.2)
        .ringRepeatPeriod(860);
    } catch (_) {}
  }

  function tickAurora(now) {
    if (!auroraPoints || !auroraSeeds.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const waveT = reduce ? 0 : now / 1000;
    const sun = subsolarPoint(new Date(Date.now() + sunHours * 3600000));
    const nightLng = wrapLng(sun.lng + 180);
    const pos = auroraPoints.geometry.attributes.position.array;
    for (let i = 0; i < auroraSeeds.length; i++) {
      const s = auroraSeeds[i];
      const wave = Math.sin(waveT * 0.9 + s.jitter);
      const p = coords(
        s.lat0 + wave * 0.65,
        wrapLng(nightLng + s.lngOff + wave * 2.4),
        s.alt0 + Math.abs(wave) * 0.03
      );
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    auroraPoints.geometry.attributes.position.needsUpdate = true;
    auroraPoints.material.opacity = reduce ? 0.55 : 0.48 + Math.abs(Math.sin(now / 1400)) * 0.28;
  }

  function clearWeather() {
    if (!weather) return;
    if (weather.points && weather.points.parent) weather.points.parent.remove(weather.points);
    weather = null;
  }

  function tickWeather(dt) {
    if (!weather || !weather.points) return;
    const { seeds, positions, origin, up, tangent, bitangent, kind } = weather;
    const fall = kind === "snow" ? 0.00035 : 0.0009;
    const height = kind === "snow" ? 14 : 18;
    const spread = kind === "snow" ? 11 : 8;
    for (let i = 0; i < seeds.length; i++) {
      seeds[i] += dt * fall * (0.7 + (i % 5) * 0.08);
      if (seeds[i] > 1) seeds[i] -= 1;
      const t = seeds[i];
      const a = i * 2.399;
      const r = (0.2 + (i % 7) / 7) * spread;
      positions[i * 3] = origin.x + tangent.x * Math.cos(a) * r + bitangent.x * Math.sin(a) * r + up.x * (1 - t) * height;
      positions[i * 3 + 1] = origin.y + tangent.y * Math.cos(a) * r + bitangent.y * Math.sin(a) * r + up.y * (1 - t) * height;
      positions[i * 3 + 2] = origin.z + tangent.z * Math.cos(a) * r + bitangent.z * Math.sin(a) * r + up.z * (1 - t) * height;
    }
    weather.points.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Local rain/snow at a place. Omit args to clear.
   * @param {number} [lat]
   * @param {number} [lng]
   * @param {"rain"|"snow"|null} [kind]
   */
  function setWeather(lat, lng, kind) {
    clearWeather();
    if (!kind || lat == null || lng == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const origin = coords(lat, lng, 0.12);
    const up = new THREE.Vector3(origin.x, origin.y, origin.z).normalize();
    const tmp = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(up, tmp).normalize();
    const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const count = kind === "snow" ? 70 : 90;
    const positions = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i++) seeds.push(Math.random());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: kind === "snow" ? 0xffffff : 0x9ad8ff,
        size: kind === "snow" ? 2.1 : 1.15,
        sizeAttenuation: true,
        transparent: true,
        opacity: kind === "snow" ? 0.92 : 0.7,
        depthWrite: false,
      })
    );
    world.scene().add(points);
    weather = { kind, origin, up, tangent, bitangent, seeds, positions, points };
    tickWeather(0);
  }

  function setSunHours(hours) {
    sunHours = Number.isFinite(hours) ? hours : 0;
    applySun();
  }

  applyFill();
  applyLook(10.4);

  return {
    setPlaces,
    setNight,
    setActive,
    setAutoRotate,
    pointOfView,
    punch,
    lockRadar,
    setWeather,
    setSunHours,
    skyShowLook() {
      const when = new Date(Date.now() + sunHours * 3600000);
      return terminatorLook(subsolarPoint(when));
    },
  };
}
