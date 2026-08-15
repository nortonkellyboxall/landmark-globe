import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SPACE_BODIES, labelName, orbitSpinSeconds } from "./space-catalog.js";

/**
 * Interactive 3D solar system (spheres + orbits + camera controls).
 * Not to true scale — tuned so kids can see and tap every world.
 * Body truth lives in SpaceCatalog; this module only renders.
 * Orbit periods follow catalog orbitYears (Earth year = EARTH_YEAR_SECONDS).
 */
const HOME_CAM = new THREE.Vector3(50, 78, 136);
function toVisualDef(body) {
  const v = body.visual || {};
  const years = body.orbitYears;
  const periodSec = years != null ? orbitSpinSeconds(years) : null;
  return {
    id: body.id,
    kind: body.kind,
    size: v.size,
    color: v.colorHex,
    emissive: v.emissive,
    style: v.style,
    orbit: v.orbit,
    orbitRadPerSec: periodSec != null ? (Math.PI * 2) / periodSec : null,
    parent: v.parent,
    rings: v.rings,
    eccentricity: v.eccentricity,
    label: labelName(body),
  };
}

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let rootGroup = null;
let animId = 0;
let containerEl = null;
let onSelect = null;
let bodies = new Map();
let raycaster = null;
let pointer = new THREE.Vector2();
let dragDist = 0;
let pointerDown = null;
let running = false;
let clock = null;
let resizeObs = null;
const textureCache = new Map();

function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

function noise2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function makePlanetTexture(def) {
  const key = def.id + ":" + (def.style || "rocky");
  if (textureCache.has(key)) return textureCache.get(key);

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const { r, g, b } = hexToRgb(def.color);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const style = def.style || "rocky";

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let nr = r;
      let ng = g;
      let nb = b;
      const n1 = noise2(u * 18, v * 14);
      const n2 = noise2(u * 40 + 3, v * 36);

      if (style === "sun") {
        const flare = 0.55 + 0.45 * Math.sin(u * 40 + n1 * 6) * Math.cos(v * 28);
        nr = Math.min(255, 255 * flare);
        ng = Math.min(255, 160 + 70 * flare);
        nb = 20 + 40 * n2;
      } else if (style === "gas") {
        const band = 0.65 + 0.35 * Math.sin(v * Math.PI * 10 + n1 * 2.5);
        nr = Math.min(255, r * band + 40 * n2);
        ng = Math.min(255, g * band);
        nb = Math.min(255, b * (0.7 + 0.3 * band));
      } else if (style === "ice") {
        const swirl = 0.75 + 0.25 * Math.sin((u + v) * 20 + n1 * 4);
        nr = Math.min(255, r * swirl + 30);
        ng = Math.min(255, g * swirl + 40);
        nb = Math.min(255, b * swirl + 50 * n2);
      } else if (style === "earth") {
        const land = n1 > 0.55;
        if (land) {
          nr = 40 + 50 * n2;
          ng = 110 + 60 * n1;
          nb = 50;
        } else {
          nr = 30 + 20 * n2;
          ng = 90 + 40 * n1;
          nb = 180 + 40 * n2;
        }
        if (v < 0.12 || v > 0.88) {
          nr = ng = nb = 235;
        }
      } else if (style === "cloudy") {
        const cloud = 0.7 + 0.3 * n1;
        nr = Math.min(255, r * cloud + 40);
        ng = Math.min(255, g * cloud + 20);
        nb = Math.min(255, b * 0.55);
      } else {
        // rocky / cratered
        const crater = n2 > 0.82 ? 0.55 : 1;
        const shade = (0.75 + 0.25 * n1) * crater;
        nr = Math.min(255, r * shade);
        ng = Math.min(255, g * shade);
        nb = Math.min(255, b * shade);
      }

      const i = (y * size + x) * 4;
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(255,200,80,0.55)");
  g.addColorStop(0.6, "rgba(255,140,0,0.15)");
  g.addColorStop(1, "rgba(255,140,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAtmosphereTexture(colorHex) {
  const { r, g, b } = hexToRgb(colorHex);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 40, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},0.08)`);
  grad.addColorStop(0.82, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addOrbitRing(orbitRadius) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0xa8c4ff,
    transparent: true,
    opacity: 0.42,
  });
  const line = new THREE.LineLoop(geo, mat);
  rootGroup.add(line);
}

function makeLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  const w = Math.min(248, ctx.measureText(text).width + 36);
  const x = (256 - w) / 2;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, 10, w, 44, 14);
    ctx.fill();
  } else {
    ctx.fillRect(x, 10, w, 44);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(6.2, 1.55, 1);
  sprite.center.set(0.5, 0);
  return sprite;
}

function makePlanetMesh(def) {
  const geo = new THREE.SphereGeometry(def.size, 48, 32);
  const map = makePlanetTexture(def);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: def.kind === "star" ? 0.35 : 0.55,
    metalness: 0.04,
    emissive: def.emissive || def.color,
    emissiveIntensity: def.emissive ? 0.85 : 0.12,
    emissiveMap: def.kind === "star" ? map : null,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.id = def.id;

  if (def.kind === "planet" || def.kind === "moon") {
    const atmo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeAtmosphereTexture(def.color),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const s = def.size * 2.55;
    atmo.scale.set(s, s, 1);
    mesh.add(atmo);
  }

  if (def.kind !== "star") {
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(def.size * 1.8, 2.2), 12, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.userData.id = def.id;
    mesh.add(hit);
  }

  if (def.rings) {
    const ringGeo = new THREE.RingGeometry(def.size * 1.35, def.size * 2.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe9c46a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.35;
    mesh.add(ring);
  }

  if (def.label) {
    const label = makeLabelSprite(def.label);
    label.position.y = def.size + 1.8;
    mesh.add(label);
  }

  return mesh;
}

function buildBelt(orbit) {
  const group = new THREE.Group();
  group.userData.id = "asteroids";
  const geo = new THREE.SphereGeometry(0.16, 6, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd0d5dd,
    roughness: 0.75,
    emissive: 0x8899aa,
    emissiveIntensity: 0.2,
  });
  const COUNT = 160;
  const inst = new THREE.InstancedMesh(geo, mat, COUNT);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = orbit + (Math.random() - 0.5) * 3.2;
    const y = (Math.random() - 0.5) * 0.9;
    dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    dummy.scale.setScalar(0.7 + Math.random() * 2.2);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);
  addOrbitRing(orbit);
  rootGroup.add(group);
  bodies.set("asteroids", {
    mesh: group,
    def: { id: "asteroids", kind: "belt", orbit, orbitRadPerSec: (Math.PI * 2) / orbitSpinSeconds(4.6) },
    angle: 0,
  });
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050816);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 260;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 260;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 260;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true })
    )
  );

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  scene.add(new THREE.AmbientLight(0xc8d4ff, 0.55));
  scene.add(new THREE.HemisphereLight(0xfff2d4, 0x223355, 0.45));
  const sunLight = new THREE.PointLight(0xfff0c8, 3.8, 260, 1.15);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(20, 40, 30);
  scene.add(fill);

  bodies.clear();

  const defs = SPACE_BODIES.map(toVisualDef);
  defs.forEach((def) => {
    if (def.kind === "belt") {
      buildBelt(def.orbit);
      return;
    }
    if (def.kind === "star") {
      const sun = makePlanetMesh(def);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeGlowTexture(),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.scale.set(28, 28, 1);
      sun.add(glow);
      rootGroup.add(sun);
      bodies.set(def.id, { mesh: sun, def, angle: 0 });
      return;
    }
    if (def.kind === "moon") return;

    if (def.kind === "comet") {
      const pivot = new THREE.Object3D();
      const mesh = makePlanetMesh(def);
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 1.8, 8),
        new THREE.MeshBasicMaterial({ color: 0xbde0fe, transparent: true, opacity: 0.45 })
      );
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -1.1;
      mesh.add(tail);
      pivot.add(mesh);
      rootGroup.add(pivot);
      bodies.set(def.id, {
        mesh,
        pivot,
        def,
        angle: Math.random() * Math.PI * 2,
      });
      return;
    }

    const pivot = new THREE.Object3D();
    const mesh = makePlanetMesh(def);
    mesh.position.x = def.orbit;
    pivot.add(mesh);
    addOrbitRing(def.orbit);
    rootGroup.add(pivot);
    bodies.set(def.id, {
      mesh,
      pivot,
      def,
      angle: Math.random() * Math.PI * 2,
    });

    if (def.id === "earth") {
      const moonBody = SPACE_BODIES.find((d) => d.id === "moon");
      const moonDef = toVisualDef(moonBody);
      const moonPivot = new THREE.Object3D();
      const moon = makePlanetMesh(moonDef);
      moon.position.x = moonDef.orbit;
      moonPivot.add(moon);
      mesh.add(moonPivot);
      bodies.set("moon", {
        mesh: moon,
        pivot: moonPivot,
        def: moonDef,
        angle: Math.random() * Math.PI * 2,
      });
    }
  });

  rootGroup.rotation.x = 0.42;
}

function animate() {
  if (!running) return;
  animId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  bodies.forEach((entry) => {
    const { def, mesh, pivot } = entry;
    if (def.kind === "star") {
      mesh.rotation.y += dt * 0.15;
      return;
    }
    const omega = def.orbitRadPerSec != null ? def.orbitRadPerSec : 0.2;
    if (def.kind === "belt") {
      mesh.rotation.y += dt * omega;
      return;
    }
    entry.angle += dt * omega;
    if (def.kind === "comet") {
      const e = def.eccentricity || 0.5;
      const a = def.orbit;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(entry.angle));
      mesh.position.set(Math.cos(entry.angle) * r, 0, Math.sin(entry.angle) * r);
    } else if (pivot) {
      pivot.rotation.y = entry.angle;
      mesh.rotation.y += dt * 0.8;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

function onPointerDown(e) {
  pointerDown = { x: e.clientX, y: e.clientY };
  dragDist = 0;
}

function onPointerMove(e) {
  if (!pointerDown) return;
  dragDist = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
}

function pickAt(clientX, clientY) {
  if (!renderer || !camera || !onSelect) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const meshes = [];
  bodies.forEach((entry) => {
    if (entry.def.kind === "belt") return;
    meshes.push(entry.mesh);
  });

  const belt = bodies.get("asteroids");
  if (belt) {
    if (!belt.hit) {
      const hit = new THREE.Mesh(
        new THREE.TorusGeometry(belt.def.orbit, 1.3, 8, 48),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.rotation.x = Math.PI / 2;
      hit.userData.id = "asteroids";
      rootGroup.add(hit);
      belt.hit = hit;
    }
    meshes.push(belt.hit);
  }

  const hits = raycaster.intersectObjects(meshes, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !obj.userData.id && obj.parent) obj = obj.parent;
  const id = obj && obj.userData.id;
  if (id) onSelect(id);
}

function onPointerUp(e) {
  if (!pointerDown) return;
  const wasTap = dragDist < 8;
  pointerDown = null;
  if (wasTap) pickAt(e.clientX, e.clientY);
}

function onResize() {
  if (!renderer || !camera || !containerEl) return;
  const w = containerEl.clientWidth || 1;
  const h = containerEl.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function destroy() {
  running = false;
  cancelAnimationFrame(animId);
  if (resizeObs) {
    resizeObs.disconnect();
    resizeObs = null;
  }
  if (renderer) {
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
  if (controls) controls.dispose();
  renderer = null;
  scene = null;
  camera = null;
  controls = null;
  rootGroup = null;
  bodies.clear();
  containerEl = null;
  onSelect = null;
}

let camTween = 0;

function bodyWorldPos(id) {
  const entry = bodies.get(id);
  if (!entry || !entry.mesh) return new THREE.Vector3();
  if (rootGroup) rootGroup.updateWorldMatrix(true, true);
  const p = new THREE.Vector3();
  entry.mesh.getWorldPosition(p);
  return p;
}

function tweenCamera(toPos, toTarget, ms) {
  return new Promise((resolve) => {
    if (!camera || !controls) {
      resolve();
      return;
    }
    const id = ++camTween;
    const from = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    const dur = Math.max(1, ms);
    function step(now) {
      if (id !== camTween || !camera || !controls) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(from, toPos, e);
      controls.target.lerpVectors(fromTarget, toTarget, e);
      controls.update();
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function earthClosePos(distance = 5.4) {
  const p = bodyWorldPos("earth");
  const dir = p.clone().normalize();
  if (dir.lengthSq() < 0.01) dir.set(0.45, 0.28, 0.85);
  return { pos: p.clone().add(dir.multiplyScalar(distance)), target: p };
}

function frameEarth(distance = 5.4) {
  if (!camera || !controls) return;
  const { pos, target } = earthClosePos(distance);
  camera.position.copy(pos);
  controls.target.copy(target);
  controls.minDistance = 3.2;
  controls.autoRotate = false;
  controls.update();
}

function playIntroZoom() {
  if (!camera || !controls) return Promise.resolve();
  frameEarth(5.4);
  controls.autoRotate = false;
  return tweenCamera(HOME_CAM.clone(), new THREE.Vector3(0, 0, 0), 2200).then(() => {
    if (controls) {
      controls.minDistance = 12;
      controls.autoRotate = true;
    }
  });
}

function zoomToEarth(ms = 1600) {
  if (!camera || !controls) return Promise.resolve();
  controls.autoRotate = false;
  controls.minDistance = 3.2;
  const { pos, target } = earthClosePos(5.4);
  return tweenCamera(pos, target, ms);
}

function init(container, opts) {
  destroy();
  if (!container) return;
  containerEl = container;
  onSelect = opts && opts.onSelect;
  container.innerHTML = "";

  const w = container.clientWidth || 640;
  const h = container.clientHeight || 420;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.setAttribute("aria-label", "3D solar system");

  camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 800);
  camera.position.copy(HOME_CAM);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 240;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });

  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();

  buildScene();

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  resizeObs = new ResizeObserver(() => onResize());
  resizeObs.observe(container);

  const startActive = !opts || opts.startActive !== false;
  running = startActive;
  if (startActive) animate();

  if (opts && opts.introZoom) {
    frameEarth(5.4);
    playIntroZoom();
  }
}

function setActive(active) {
  if (active) {
    if (!running && renderer) {
      running = true;
      clock.getDelta();
      animate();
    }
    onResize();
  } else {
    running = false;
    cancelAnimationFrame(animId);
  }
}

function highlight(id) {
  bodies.forEach((entry, key) => {
    const mesh = entry.mesh;
    if (!mesh || !mesh.material || mesh.isGroup) return;
    const mat = mesh.material;
    if (!mat || mat.emissiveIntensity == null) return;
    if (key === id) {
      mat.emissiveIntensity = key === "sun" ? 1.15 : 0.35;
    } else {
      mat.emissiveIntensity = key === "sun" ? 0.85 : 0.12;
    }
  });
}

export {
  init,
  destroy,
  onResize as resize,
  setActive,
  highlight,
  playIntroZoom,
  frameEarth,
  zoomToEarth,
};
