import * as THREE from 'three';
import { rng, mat, mesh, palm, person, glowSprite, bake } from './common.js';

// Kaukira: stilt houses on the lagoon shore, palms, a dugout canoe, sunset.
export function buildKaukira() {
  const r = rng(7);
  const group = new THREE.Group();

  // Lagoon water with gentle low-poly waves.
  // Waves are computed on the GPU; flat shading derives normals per pixel.
  const uTime = { value: 0 };
  const seaMat = new THREE.MeshStandardMaterial({ color: '#3a8d97', flatShading: true, roughness: 0.55 });
  seaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.z += sin(position.x * 0.22 + uTime * 0.9) * 0.16 + cos(position.y * 0.31 + uTime * 1.2) * 0.13
        + sin((position.x + position.y) * 0.11 + uTime * 0.5) * 0.12 - 0.15;`
    );
  };
  const sea = mesh(new THREE.PlaneGeometry(170, 170, 70, 70), seaMat, { rx: -Math.PI / 2 });
  sea.userData.keep = true;
  group.add(sea);
  // A flat far ocean so the horizon melts into the fog instead of ending.
  const farSea = mesh(new THREE.RingGeometry(70, 900, 64, 1), new THREE.MeshStandardMaterial({ color: '#3a8d97', roughness: 0.6 }), { y: -0.2, rx: -Math.PI / 2 });
  farSea.userData.keep = true;
  group.add(farSea);

  // Sand bars.
  const sandMat = mat('#e8cf9c');
  const sand = mesh(new THREE.CylinderGeometry(10, 11.5, 1.4, 22), sandMat, { x: -5, y: -0.3, z: -3 });
  sand.scale.z = 0.7;
  group.add(sand);
  const sand2 = mesh(new THREE.CylinderGeometry(4.5, 5.5, 1.2, 16), sandMat, { x: 11, y: -0.35, z: -9 });
  sand2.scale.z = 0.6;
  group.add(sand2);

  // Palms.
  const palms = [];
  const spots = [[-12, -6], [-9, -1], [-3, -7], [-14, 0.5], [2, -5.5], [-7, -9], [10, -10], [12.5, -8]];
  for (const [x, z] of spots) {
    const p = palm(r, 5 + r() * 2.5);
    p.position.set(x, 0.35, z);
    p.rotation.y = r() * Math.PI * 2;
    p.userData.crown.userData.dynamic = true;
    group.add(p);
    palms.push(p);
  }

  // Stilt houses, the way houses are built along the lagoon.
  const walls = ['#b98b5a', '#c9a06b', '#a77b4f', '#d6b27c', '#9c6f45'];
  const roofs = ['#8a7b4a', '#9b8a52', '#7d6d3f'];
  const houses = [
    { x: -6, z: 4, w: 3.4, d: 2.8, ry: 0.15 },
    { x: 0.5, z: 5.5, w: 3, d: 2.6, ry: -0.2 },
    { x: 6.5, z: 2.5, w: 3.6, d: 3, ry: 0.35 },
    { x: -12.5, z: 5.5, w: 2.8, d: 2.4, ry: 0.5 },
    { x: 4, z: -3, w: 3, d: 2.6, ry: -0.1 },
  ];
  houses.forEach((h, i) => {
    const g = new THREE.Group();
    const stiltH = 2.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, stiltH + 1, 5), mat('#5e4430'), { x: (sx * h.w) / 2, y: stiltH / 2 - 0.5, z: (sz * h.d) / 2 }));
    }
    g.add(mesh(new THREE.BoxGeometry(h.w + 0.9, 0.15, h.d + 0.9), mat('#7a5a3c'), { y: stiltH }));
    g.add(mesh(new THREE.BoxGeometry(h.w, 1.7, h.d), mat(walls[i % walls.length]), { y: stiltH + 0.92 }));
    g.add(mesh(new THREE.BoxGeometry(0.7, 1.15, 0.05), mat('#3d2a1c'), { y: stiltH + 0.66, z: h.d / 2 + 0.03 }));
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.55, 0.05), mat('#2a1d14'), { x: h.w / 3.2, y: stiltH + 1.15, z: h.d / 2 + 0.03 }));
    const roof = mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.86, 1.8, 4), mat(roofs[i % roofs.length]), { y: stiltH + 2.65, ry: Math.PI / 4 });
    roof.scale.z = h.d / h.w;
    g.add(roof);
    // A small ladder down to the water.
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.7, 0.07, 0.12), mat('#6b4d34'), { y: stiltH - 0.45 - k * 0.5, z: h.d / 2 + 0.7 }));
    g.position.set(h.x, 0, h.z);
    g.rotation.y = h.ry;
    group.add(g);
  });

  // Plank walkway from the shore to the houses.
  for (let i = 0; i < 9; i++) {
    group.add(mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5 + r() * 0.15), mat('#8d6b49'), { x: -3 + i * 0.95, y: 1.15, z: 0.8 + i * 0.25, ry: 1.2 + r() * 0.1 }));
  }

  // A cayuco, the dugout canoe, with someone paddling.
  const canoe = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#6a4528', { side: THREE.DoubleSide }), { s: [2.8, 0.55, 0.62] });
  canoe.add(hull);
  const rower = person('#d4553f', '#7a4a2e', true);
  rower.position.set(0.4, -0.35, 0);
  rower.scale.setScalar(0.8);
  canoe.add(rower);
  const paddle = mesh(new THREE.BoxGeometry(0.06, 2.4, 0.06), mat('#c9a36a'), { x: 0.6, y: 0.6, z: 0.55, rz: 0.5 });
  canoe.add(paddle);
  canoe.userData.dynamic = true;
  group.add(canoe);

  // Birds over the lagoon.
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const wingMat = mat('#2b2b33');
    const lw = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.25), wingMat, { x: -0.42 });
    const rw = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.25), wingMat, { x: 0.42 });
    const lp = new THREE.Group(); lp.add(lw);
    const rp = new THREE.Group(); rp.add(rw);
    b.add(lp, rp);
    b.userData = { lp, rp, radius: 14 + r() * 14, speed: 0.08 + r() * 0.06, phase: r() * Math.PI * 2, height: 10 + r() * 6 };
    b.userData.dynamic = true;
    group.add(b);
    birds.push(b);
  }

  // The low sun.
  const sunMat = new THREE.MeshBasicMaterial({ color: '#fff1d0', fog: false, transparent: true, toneMapped: false });
  const sun = mesh(new THREE.CircleGeometry(10, 48), sunMat, { x: -30, y: 24, z: -260 });
  sun.renderOrder = 2;
  sun.userData.keep = true;
  group.add(sun);
  const glow = glowSprite('#ffb36b', 110, 0.6);
  glow.renderOrder = 1;
  // Glare over the water too, so the horizon has no seam.
  glow.material.depthTest = false;
  glow.position.copy(sun.position);
  group.add(glow);

  bake(group);

  function update(t, dt, info) {
    uTime.value = t;

    for (const pl of palms) {
      pl.userData.crown.rotation.z = Math.sin(t * 0.9 + pl.userData.phase) * 0.06;
      pl.userData.crown.rotation.x = Math.cos(t * 0.7 + pl.userData.phase) * 0.04;
    }

    const a = t * 0.05;
    canoe.position.set(Math.cos(a) * 17 + 2, 0.15 + Math.sin(t * 1.6) * 0.06, Math.sin(a) * 7 + 9);
    canoe.rotation.y = Math.atan2(-Math.cos(a) * 7, -Math.sin(a) * 17);
    canoe.rotation.z = Math.sin(t * 1.3) * 0.04;
    paddle.rotation.x = Math.sin(t * 2.2) * 0.5;

    for (const b of birds) {
      const u = b.userData;
      const ang = u.phase + t * u.speed;
      b.position.set(Math.cos(ang) * u.radius, u.height + Math.sin(t + u.phase) * 0.6, Math.sin(ang) * u.radius * 0.6 - 10);
      b.rotation.y = -ang;
      const flap = Math.sin(t * 6 + u.phase) * 0.45;
      u.lp.rotation.z = flap;
      u.rp.rotation.z = -flap;
    }

    sunMat.opacity = info.palette.sunDisc;
    glow.material.opacity = info.palette.sunDisc * 0.6;
  }

  return { group, update, radius: 60 };
}
