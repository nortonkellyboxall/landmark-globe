# Plan 005: Draw the asteroid belt with one InstancedMesh

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63369fe..HEAD -- solar3d.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `63369fe`, 2026-08-15

## Why this matters

`buildBelt` creates **160** `THREE.Mesh` objects that share one geometry and one material. `animate()` still submits ~160 draws every Solar3D frame. `THREE.InstancedMesh` is the same look (random positions/scales already computed per rock) at one draw. That is free GPU headroom for later space motion. Do not change orbit radius, count, or material color.

## Current state

```289:315:solar3d.js
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
  for (let i = 0; i < 160; i++) {
    const rock = new THREE.Mesh(geo, mat);
    const a = Math.random() * Math.PI * 2;
    const r = orbit + (Math.random() - 0.5) * 3.2;
    const y = (Math.random() - 0.5) * 0.9;
    rock.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    rock.scale.setScalar(0.7 + Math.random() * 2.2);
    group.add(rock);
  }
  addOrbitRing(orbit);
  rootGroup.add(group);
  bodies.set("asteroids", {
    mesh: group,
    def: { id: "asteroids", kind: "belt", orbit, orbitRadPerSec: (Math.PI * 2) / orbitSpinSeconds(4.6) },
    angle: 0,
  });
}
```

`animate` already rotates the belt as a whole (`def.kind === "belt"` → `mesh.rotation.y += ...`). InstancedMesh as `group` child (or replacing the group) still works if `userData.id === "asteroids"` stays on the object stored in `bodies`.

`solar3d.js` cannot be imported in Node (`three` is importmap-only). Do **not** add a Three test. Verification is structural (`rg`) plus existing `space-mode.check.js` (does not init WebGL).

CONTEXT: `solar3d.js` only renders; SpaceCatalog owns body data. Count 160 is visual, not catalog data — keep 160.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Structure | `rg "new THREE.Mesh" solar3d.js` | no match inside `buildBelt` (other meshes in `makePlanetMesh` OK) |
| Structure | `rg "InstancedMesh" solar3d.js` | at least one hit in `buildBelt` |
| Checks | `node tests/space-mode.check.js` and the other nine | OK |

## Scope

**In scope**:
- `solar3d.js` `buildBelt` only

**Out of scope**:
- Planet meshes, comet, orbit rings
- Reducing 160 to a smaller count (not requested)
- `BufferGeometry` custom shaders
- Importing solar3d in tests
- Handoff pause (003)

## Git workflow

- Branch: `feature/perf-asteroid-instances` or shared wave branch
- Commit: `perf(space): instance asteroid belt meshes`
- graphify after commit

## Steps

### Step 1: Replace the Mesh loop

Keep `geo`, `mat`, `group`, `userData.id`, `addOrbitRing`, `bodies.set` as today. Inside the loop use one `InstancedMesh`:

```js
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
```

Do **not** `group.add` 160 Meshes. Pick still works via the group id on `userData` if `pickAt` uses `bodies` meshes — confirm `pickAt` / `highlight` for `"asteroids"`: if highlight scales the group, InstancedMesh inside the group is fine. If `pickAt` raycasts and expects 160 meshes, InstancedMesh still raycasts as one object (tapping “a rock” selects the belt) — **that is acceptable**; do not restore per-rock picking.

**Verify**:

```bash
rg -n "function buildBelt" -A 40 solar3d.js
```

Shows `InstancedMesh` and **no** `new THREE.Mesh` in those 40 lines.

```bash
rg "new THREE.Mesh\\(geo" solar3d.js
```

No matches.

`node tests/space-mode.check.js` OK.

### Step 2: Full suite

**Verify**: ten checks OK.

## Test plan

- No new Node file (cannot load Three).
- Human smoke: space tab — belt still a ring of small rocks, still orbits. If belt is invisible, `instanceMatrix.needsUpdate` forgotten — fix once; if still invisible, STOP.

## Done criteria

- [ ] `buildBelt` uses `THREE.InstancedMesh` with count 160
- [ ] no `new THREE.Mesh(geo, mat)` in `buildBelt`
- [ ] `bodies` still has `asteroids` with `kind: "belt"` so `animate` rotates it
- [ ] ten checks OK; README 005 DONE; graphify updated

## STOP conditions

- `highlight("asteroids")` throws because it assumed `.children` of Meshes — fix by highlighting the group/inst mesh; if highlight API needs a new scene graph, STOP and report rather than rewriting `highlight`.
- You add `InstancedBufferGeometry` or a custom shader.
- You change rock count or orbit math “for performance”.

## Maintenance notes

- More belt rocks: raise `COUNT` only; keep InstancedMesh.
- Reviewer: `animate` belt branch still rotates `entry.mesh` (the group).
