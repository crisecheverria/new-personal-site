import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { LOW_POWER, rng, mat, mesh, palm, tex, waveNormals, terrain, valueNoise, fbm, bake, shadows, pitchedRoof } from './common.js';

// Kaukira at sunset: stilt houses on the lagoon shore, palms, a moored cayuco.
export function buildKaukira() {
  const r = rng(7);
  const group = new THREE.Group();
  const n = valueNoise(5);

  // Sandbars rising out of the lagoon floor; the water is slightly clear, so
  // the sand shows through near the shore.
  const bump = (x, z, cx, cz, rx, rz) => {
    const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
    return Math.max(0, 1 - d);
  };
  const height = (x, z) => {
    const land = Math.max(bump(x, z, -6, -4, 15, 8.5), bump(x, z, 13, -10, 7, 3.6) * 0.85, bump(x, z, -22, -14, 9, 4) * 0.8);
    return -2.4 + Math.pow(land, 0.6) * 3.2 + (fbm(n, x * 0.15, z * 0.15, 3) - 0.5) * 0.5;
  };
  const sand = terrain(160, 160, height, mat('#ffffff', { map: tex('sand', 16), roughness: 1 }));
  group.add(sand);

  // The lagoon: a reflective water surface (it mirrors the houses, palms and
  // sky), with crossing waves and the sun's glitter.
  const water = new Water(new THREE.PlaneGeometry(1200, 1200), {
    textureWidth: LOW_POWER ? 512 : 1024,
    textureHeight: LOW_POWER ? 512 : 1024,
    waterNormals: waveNormals(),
    sunDirection: new THREE.Vector3(-0.208, 0.075, -0.978).normalize(),
    sunColor: '#ffcf9a',
    waterColor: '#0b3a40',
    distortionScale: 1.2,
    fog: true,
  });
  water.material.uniforms.size.value = 3.6;
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.02;
  water.receiveShadow = true;
  water.userData.keep = true;
  group.add(water);

  // Palms on the sand.
  const palms = [];
  const spots = [[-15, -6], [-11, -1.5], [-4, -8.5], [-17, 0], [2.5, -6], [-8, -10.5], [11, -10.5], [14, -9], [-21, -13], [-25, -15], [6, -7.5]];
  for (const [x, z] of spots) {
    const p = palm(r, 6 + r() * 4);
    p.position.set(x, height(x, z) - 0.2, z);
    p.userData.crown.userData.dynamic = true;
    group.add(p);
    palms.push(p);
  }

  // Stilt houses: plank walls, thatch or zinc roofs, a ladder to the water.
  const thatch = mat('#ffffff', { map: tex('thatch', 3, 2), roughness: 1 });
  const zinc = mat('#9aa0a6', { map: tex('siding', 1, 3), metalness: 0.55, roughness: 0.45 });
  const wallTints = ['#b89874', '#c7ab85', '#a48463', '#d0b691', '#9c7b5c'];
  const deck = mat('#8f7457', { map: tex('planks', 2, 2) });
  const stiltMat = mat('#5b4634', { map: tex('bark', 1, 2) });
  const dark = mat('#20160f', { roughness: 1 });
  const houses = [
    { x: -7, z: 4, w: 4, d: 3.2, ry: 0.15, roof: 'thatch' },
    { x: 0.5, z: 6, w: 3.6, d: 3, ry: -0.2, roof: 'zinc' },
    { x: 7.5, z: 3, w: 4.2, d: 3.4, ry: 0.35, roof: 'thatch' },
    { x: -14.5, z: 6.5, w: 3.4, d: 2.8, ry: 0.5, roof: 'zinc' },
    { x: 4.5, z: -3, w: 3.6, d: 3, ry: -0.1, roof: 'thatch' },
  ];
  houses.forEach((h, i) => {
    const g = new THREE.Group();
    const stiltH = 2.5;
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, stiltH + 2, 7), stiltMat, { x: (sx * h.w) / 2, y: stiltH / 2 - 1, z: (sz * h.d) / 2 }));
    }
    g.add(mesh(new THREE.BoxGeometry(h.w + 1.2, 0.14, h.d + 1.2), deck, { y: stiltH }));
    const walls = mat(wallTints[i % wallTints.length], { map: tex('planks', 2, 1) });
    g.add(mesh(new THREE.BoxGeometry(h.w, 1.9, h.d), walls, { y: stiltH + 1.02 }));
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.35, 0.06), dark, { x: -h.w * 0.15, y: stiltH + 0.75, z: h.d / 2 + 0.02 }));
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.55, 0.06), dark, { x: h.w * 0.27, y: stiltH + 1.25, z: h.d / 2 + 0.02 }));
    // Deck railing.
    for (let k = 0; k <= 6; k++) g.add(mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), stiltMat, { x: -h.w / 2 - 0.55 + (k * (h.w + 1.1)) / 6, y: stiltH + 0.4, z: h.d / 2 + 0.58 }));
    g.add(mesh(new THREE.BoxGeometry(h.w + 1.1, 0.06, 0.08), stiltMat, { y: stiltH + 0.74, z: h.d / 2 + 0.58 }));
    if (h.roof === 'thatch') {
      const roof = mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.88, 2.1, 4, 1), thatch, { y: stiltH + 3.0, ry: Math.PI / 4 });
      roof.scale.z = h.d / h.w;
      g.add(roof);
    } else {
      const roof = pitchedRoof(h.w + 1, 1.1, h.d + 1, zinc, 0.06);
      roof.position.y = stiltH + 1.97;
      g.add(roof);
      // Gable ends.
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape([new THREE.Vector2(-h.w / 2, 0), new THREE.Vector2(h.w / 2, 0), new THREE.Vector2(0, 1.05)]);
        g.add(mesh(new THREE.ShapeGeometry(shape), walls, { y: stiltH + 1.97, z: (side * h.d) / 2, ry: side < 0 ? Math.PI : 0 }));
      }
    }
    for (let k = 0; k < 5; k++) g.add(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.14), stiltMat, { x: h.w * 0.3, y: stiltH - 0.45 - k * 0.5, z: h.d / 2 + 1.0 }));
    g.position.set(h.x, 0, h.z);
    g.rotation.y = h.ry;
    group.add(g);
  });

  // A plank walkway from the sand to the houses.
  for (let i = 0; i < 12; i++) {
    group.add(mesh(new THREE.BoxGeometry(1.1, 0.09, 0.42 + r() * 0.12), deck, { x: -4 + i * 0.95, y: 1.1 + Math.sin(i) * 0.03, z: 0.4 + i * 0.28, ry: 1.25 + (r() - 0.5) * 0.08 }));
  }
  for (let i = 0; i < 6; i++) group.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 3, 6), stiltMat, { x: -3.5 + i * 1.9, y: -0.3, z: 0.9 + i * 0.56 }));

  // A cayuco, the dugout canoe, moored by the houses.
  const canoe = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  canoe.add(mesh(hullGeo, mat('#5a3d27', { map: tex('planks', 1, 1), side: THREE.DoubleSide }), { s: [3.2, 0.55, 0.62] }));
  canoe.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 2.6), mat('#c9a36a'), { x: 0.6, y: 0.08, rz: 0.1, ry: 1.2 }));
  canoe.position.set(3, 0.1, 9);
  canoe.rotation.y = 0.4;
  canoe.userData.dynamic = true;
  group.add(canoe);

  // A few birds far off.
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const wingMat = mat('#2b2a2e');
    const lp = new THREE.Group(), rp = new THREE.Group();
    lp.add(mesh(new THREE.BoxGeometry(0.9, 0.03, 0.22), wingMat, { x: -0.42 }));
    rp.add(mesh(new THREE.BoxGeometry(0.9, 0.03, 0.22), wingMat, { x: 0.42 }));
    b.add(lp, rp);
    b.userData = { lp, rp, radius: 24 + r() * 20, speed: 0.05 + r() * 0.04, phase: r() * Math.PI * 2, height: 14 + r() * 8, dynamic: true };
    group.add(b);
    birds.push(b);
  }

  shadows(group);
  sand.castShadow = false;
  water.castShadow = false;
  bake(group);

  function update(t, dt, info) {
    water.material.uniforms.time.value = t * 0.6;
    water.material.uniforms.sunDirection.value.copy(info.palette.sunDir);
    for (const pl of palms) {
      pl.userData.crown.rotation.z = Math.sin(t * 0.8 + pl.userData.phase) * 0.04;
      pl.userData.crown.rotation.x = Math.cos(t * 0.6 + pl.userData.phase) * 0.03;
    }
    canoe.position.y = 0.08 + Math.sin(t * 1.3) * 0.05;
    canoe.rotation.z = Math.sin(t * 1.1) * 0.03;
    canoe.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.05;
    for (const b of birds) {
      const u = b.userData;
      const ang = u.phase + t * u.speed;
      b.position.set(Math.cos(ang) * u.radius - 6, u.height + Math.sin(t + u.phase) * 0.6, Math.sin(ang) * u.radius * 0.5 - 30);
      b.rotation.y = -ang;
      const flap = Math.sin(t * 5 + u.phase) * 0.4;
      u.lp.rotation.z = flap;
      u.rp.rotation.z = -flap;
    }
  }

  return { group, update };
}
