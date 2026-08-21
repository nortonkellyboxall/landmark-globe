/** Earth-mesh surface FX for Solar3D (clouds, aurora, weather, radar). */

import * as THREE from "three";
import {
  lookFromAltitude,
  wrapLng,
  dueThisFrame,
  GLOBE_TICK,
} from "./orbit-look.js";
import {
  earthLocalPos,
  sunYawRadians,
  auroraNightLng,
  fxScale,
} from "./earth-fx.js";

const EARTH_BUMP = "textures/earth/earth-topology.png";
const EARTH_CLOUDS =
  "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-clouds.png";
const EARTH_NIGHT =
  "https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-night.jpg";

const AURORA_ROWS = 14;

/**
 * @param {THREE.Mesh} earthMesh
 * @param {number} R
 */
export function createEarthSurface(earthMesh, R) {
  let cloudsMesh = null;
  let atmoShell = null;
  /** @type {THREE.Group|null} */
  let auroraGroup = null;
  /** @type {{ mesh: THREE.Mesh, north: boolean, lngOff: number, jitter: number, width: number }[]} */
  let auroraCurtains = [];
  let weather = null;
  let radar = null;
  let sunHours = 0;
  let axialSpin = earthMesh.rotation.y || 0;
  let lookBand = "";
  let weatherDt = 0;
  let fxFrame = 0;
  const _up = new THREE.Vector3();
  const _tmp = new THREE.Vector3();
  const _tangent = new THREE.Vector3();
  const _bitangent = new THREE.Vector3();

  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x5ec8ff,
    transparent: true,
    opacity: 0.16,
    side: THREE.BackSide,
    depthWrite: false,
  });
  atmoShell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 48, 32), atmoMat);
  atmoShell.renderOrder = 1;
  earthMesh.add(atmoShell);

  new THREE.TextureLoader().load(
    EARTH_BUMP,
    (tex) => {
      const mat = earthMesh.material;
      if (!mat) return;
      mat.bumpMap = tex;
      mat.bumpScale = 0.04;
      mat.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  new THREE.TextureLoader().load(
    EARTH_NIGHT,
    (nightTex) => {
      const mat = earthMesh.material;
      if (!mat) return;
      if (THREE.SRGBColorSpace) nightTex.colorSpace = THREE.SRGBColorSpace;
      mat.emissiveMap = nightTex;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.55;
      mat.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  new THREE.TextureLoader().load(
    EARTH_CLOUDS,
    (cloudsTexture) => {
      if (THREE.SRGBColorSpace) cloudsTexture.colorSpace = THREE.SRGBColorSpace;
      cloudsMesh = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.012, 64, 48),
        new THREE.MeshPhongMaterial({
          map: cloudsTexture,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        })
      );
      cloudsMesh.renderOrder = 2;
      earthMesh.add(cloudsMesh);
    },
    undefined,
    () => {}
  );

  function makeAuroraRibbonTexture(north) {
    const w = 64;
    const h = 128;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, h, 0, 0);
    if (north) {
      g.addColorStop(0, "rgba(40,255,140,0)");
      g.addColorStop(0.12, "rgba(60,255,160,0.55)");
      g.addColorStop(0.35, "rgba(90,255,180,0.85)");
      g.addColorStop(0.55, "rgba(120,255,210,0.45)");
      g.addColorStop(0.78, "rgba(160,220,255,0.18)");
      g.addColorStop(1, "rgba(180,210,255,0)");
    } else {
      g.addColorStop(0, "rgba(255,80,160,0)");
      g.addColorStop(0.12, "rgba(255,100,180,0.5)");
      g.addColorStop(0.35, "rgba(255,140,200,0.8)");
      g.addColorStop(0.55, "rgba(220,160,255,0.4)");
      g.addColorStop(0.78, "rgba(180,180,255,0.16)");
      g.addColorStop(1, "rgba(160,180,255,0)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(0,0,0,0.85)");
    side.addColorStop(0.2, "rgba(0,0,0,0)");
    side.addColorStop(0.8, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function buildCurtainMesh(north) {
    const geo = new THREE.BufferGeometry();
    const verts = (AURORA_ROWS + 1) * 2;
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
    const idx = [];
    for (let r = 0; r < AURORA_ROWS; r++) {
      const a = r * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    const uvs = geo.attributes.uv.array;
    for (let r = 0; r <= AURORA_ROWS; r++) {
      const v = r / AURORA_ROWS;
      uvs[r * 4] = 0;
      uvs[r * 4 + 1] = v;
      uvs[r * 4 + 2] = 1;
      uvs[r * 4 + 3] = v;
    }
    geo.attributes.uv.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: makeAuroraRibbonTexture(north),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    return mesh;
  }

  auroraGroup = new THREE.Group();
  auroraGroup.name = "aurora";
  earthMesh.add(auroraGroup);
  const CURTAINS = 7;
  for (let hem = 0; hem < 2; hem++) {
    const north = hem === 0;
    for (let c = 0; c < CURTAINS; c++) {
      const mesh = buildCurtainMesh(north);
      auroraGroup.add(mesh);
      auroraCurtains.push({
        mesh,
        north,
        lngOff: -48 + (c / (CURTAINS - 1)) * 96 + (Math.random() - 0.5) * 4,
        jitter: Math.random() * Math.PI * 2,
        width: 5.5 + (c % 3) * 1.8,
      });
    }
  }

  function applyLook(alt) {
    const look = lookFromAltitude(alt);
    if (look.band === lookBand) return look;
    lookBand = look.band;
    if (atmoShell && atmoShell.material) {
      atmoShell.material.color.set(look.atmosphereColor);
      atmoShell.material.opacity = Math.min(0.35, 0.08 + look.atmosphereAltitude);
    }
    if (cloudsMesh && cloudsMesh.material) {
      cloudsMesh.material.opacity = look.clouds;
      cloudsMesh.visible = look.clouds > 0.05;
    }
    return look;
  }

  function tickAurora(now) {
    if (!auroraCurtains.length) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const waveT = reduce ? 0 : now / 1000;
    const nightLng = auroraNightLng(new Date(), sunHours);
    const breath = reduce ? 0.65 : 0.55 + Math.abs(Math.sin(now / 1600)) * 0.3;

    for (let i = 0; i < auroraCurtains.length; i++) {
      const c = auroraCurtains[i];
      const wave = Math.sin(waveT * 0.85 + c.jitter);
      const pos = c.mesh.geometry.attributes.position.array;
      const sign = c.north ? 1 : -1;
      for (let r = 0; r <= AURORA_ROWS; r++) {
        const t = r / AURORA_ROWS;
        const alt = 0.04 + t * 0.22 + Math.abs(wave) * 0.015;
        const lat = sign * (66.5 + t * 5.5 + wave * 0.9 + (i % 3) * 0.4);
        const sway = wave * (2.2 + t * 3.5);
        const lngL = wrapLng(nightLng + c.lngOff - c.width * 0.5 + sway);
        const lngR = wrapLng(nightLng + c.lngOff + c.width * 0.5 + sway * 0.7);
        const [x0, y0, z0] = earthLocalPos(lat, lngL, alt, R);
        const [x1, y1, z1] = earthLocalPos(lat, lngR, alt, R);
        const o = r * 6;
        pos[o] = x0;
        pos[o + 1] = y0;
        pos[o + 2] = z0;
        pos[o + 3] = x1;
        pos[o + 4] = y1;
        pos[o + 5] = z1;
      }
      c.mesh.geometry.attributes.position.needsUpdate = true;
      c.mesh.material.opacity = breath * (0.85 + (i % 3) * 0.05);
    }
  }

  tickAurora(0);

  function clearWeather() {
    if (!weather) return;
    if (weather.points && weather.points.parent) weather.points.parent.remove(weather.points);
    if (weather.points) {
      weather.points.geometry.dispose();
      weather.points.material.dispose();
    }
    weather = null;
  }

  function tickWeather(dt) {
    if (!weather || !weather.points) return;
    const { seeds, positions, origin, up, tangent, bitangent, kind } = weather;
    const fall = kind === "snow" ? 0.00035 : 0.0009;
    const height = fxScale(R, kind === "snow" ? 14 : 18);
    const spread = fxScale(R, kind === "snow" ? 11 : 8);
    for (let i = 0; i < seeds.length; i++) {
      seeds[i] += dt * fall * (0.7 + (i % 5) * 0.08);
      if (seeds[i] > 1) seeds[i] -= 1;
      const t = seeds[i];
      const a = i * 2.399;
      const r = (0.2 + (i % 7) / 7) * spread;
      positions[i * 3] =
        origin.x + tangent.x * Math.cos(a) * r + bitangent.x * Math.sin(a) * r + up.x * (1 - t) * height;
      positions[i * 3 + 1] =
        origin.y + tangent.y * Math.cos(a) * r + bitangent.y * Math.sin(a) * r + up.y * (1 - t) * height;
      positions[i * 3 + 2] =
        origin.z + tangent.z * Math.cos(a) * r + bitangent.z * Math.sin(a) * r + up.z * (1 - t) * height;
    }
    weather.points.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * @param {number} [lat]
   * @param {number} [lng]
   * @param {"rain"|"snow"|null} [kind]
   */
  function setWeather(lat, lng, kind) {
    clearWeather();
    if (!kind || lat == null || lng == null) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const [ox, oy, oz] = earthLocalPos(lat, lng, 0.12, R);
    const origin = new THREE.Vector3(ox, oy, oz);
    _up.copy(origin).normalize();
    if (Math.abs(_up.y) < 0.9) _tmp.set(0, 1, 0);
    else _tmp.set(1, 0, 0);
    _tangent.crossVectors(_up, _tmp).normalize();
    _bitangent.crossVectors(_up, _tangent).normalize();
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
        size: fxScale(R, kind === "snow" ? 2.1 : 1.15),
        sizeAttenuation: true,
        transparent: true,
        opacity: kind === "snow" ? 0.92 : 0.7,
        depthWrite: false,
      })
    );
    earthMesh.add(points);
    weather = {
      kind,
      origin: origin.clone(),
      up: _up.clone(),
      tangent: _tangent.clone(),
      bitangent: _bitangent.clone(),
      seeds,
      positions,
      points,
    };
    tickWeather(0);
  }

  function clearRadar() {
    if (!radar) return;
    if (radar.group && radar.group.parent) radar.group.parent.remove(radar.group);
    radar.rings.forEach((ring) => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    radar = null;
  }

  /**
   * Find-game radar ping. Omit args to clear.
   * @param {number} [lat]
   * @param {number} [lng]
   */
  function lockRadar(lat, lng) {
    clearRadar();
    if (lat == null || lng == null) return;
    const [ox, oy, oz] = earthLocalPos(lat, lng, 0.03, R);
    const group = new THREE.Group();
    group.position.set(ox, oy, oz);
    group.lookAt(0, 0, 0);
    const rings = [];
    const maxR = fxScale(R, 11);
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.RingGeometry(0.01, 0.02, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffc857,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      rings.push(mesh);
    }
    earthMesh.add(group);
    radar = { group, rings, maxR, t0: performance.now(), period: 860 };
  }

  function tickRadar(now) {
    if (!radar) return;
    const { rings, maxR, t0, period } = radar;
    for (let i = 0; i < rings.length; i++) {
      const age = ((now - t0) / period - i * 0.33) % 1;
      const t = age < 0 ? age + 1 : age;
      const r = Math.max(0.02, maxR * t);
      rings[i].scale.set(r, r, 1);
      rings[i].material.opacity = Math.max(0, 1 - t);
    }
  }

  function setSunHours(hours) {
    sunHours = Number.isFinite(hours) ? hours : 0;
    earthMesh.rotation.y = axialSpin + sunYawRadians(sunHours);
  }

  function getSunHours() {
    return sunHours;
  }

  /**
   * @param {number} dt
   * @param {number} nowMs
   * @param {number} spinDelta axial spin this frame (before sun yaw)
   * @param {number} alt camera altitude
   * @param {boolean} showLocal weather/radar visibility
   */
  function tick(dt, nowMs, spinDelta, alt, showLocal) {
    axialSpin += spinDelta;
    earthMesh.rotation.y = axialSpin + sunYawRadians(sunHours);
    if (cloudsMesh) cloudsMesh.rotation.y += 0.00045;
    fxFrame += 1;
    weatherDt += dt * 1000;
    if (dueThisFrame(fxFrame, GLOBE_TICK.aurora)) tickAurora(nowMs);
    if (dueThisFrame(fxFrame, GLOBE_TICK.weather)) {
      tickWeather(weatherDt);
      weatherDt = 0;
    }
    tickRadar(nowMs);
    if (dueThisFrame(fxFrame, GLOBE_TICK.pov)) applyLook(alt);
    if (weather && weather.points) weather.points.visible = showLocal;
    if (radar && radar.group) radar.group.visible = showLocal;
  }

  function dispose() {
    clearWeather();
    clearRadar();
    if (cloudsMesh && cloudsMesh.parent) cloudsMesh.parent.remove(cloudsMesh);
    if (atmoShell && atmoShell.parent) atmoShell.parent.remove(atmoShell);
    if (auroraGroup && auroraGroup.parent) auroraGroup.parent.remove(auroraGroup);
    auroraCurtains.forEach((c) => {
      c.mesh.geometry.dispose();
      if (c.mesh.material.map) c.mesh.material.map.dispose();
      c.mesh.material.dispose();
    });
    cloudsMesh = null;
    atmoShell = null;
    auroraGroup = null;
    auroraCurtains = [];
  }

  applyLook(2.4);

  return {
    applyLook,
    setWeather,
    lockRadar,
    setSunHours,
    getSunHours,
    tick,
    dispose,
  };
}
