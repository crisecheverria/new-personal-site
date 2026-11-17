import * as THREE from 'three';
import { rng, mat, mesh, tex, terrain, valueNoise, fbm, leafyTree, pitchedRoof, bake, shadows } from './common.js';

// The university: a campus building on a late afternoon, trees and paths.
export function buildUniversity() {
  const r = rng(11);
  const group = new THREE.Group();
  const n = valueNoise(13);

  const height = (x, z) => (fbm(n, x * 0.03, z * 0.03, 3) - 0.5) * 2.2 * Math.min(1, Math.hypot(x, z + 6) / 30);
  const patch = valueNoise(17);
  const ground = terrain(520, 200, height, mat('#ffffff', { map: tex('grass', 90), roughness: 1, vertexColors: true }), (x, z) => 0.62 + fbm(patch, x * 0.06, z * 0.06, 4) * 0.6);
  group.add(ground);

  // The mountains behind the city, fading into the haze.
  const hillMat = mat('#4f6b4a', { roughness: 1 });
  const hn = valueNoise(21);
  for (let layer = 0; layer < 3; layer++) {
    const w = 700, segs = 160;
    const geo = new THREE.PlaneGeometry(w, 1, segs, 1);
    const hp = geo.attributes.position;
    for (let i = 0; i <= segs; i++) {
      const x = hp.getX(i);
      const ridge = (18 + layer * 16) * (0.35 + fbm(hn, x * 0.008 + layer * 9, layer * 3.1, 5)) * (1 - Math.pow(Math.abs(x) / (w / 2), 4));
      hp.setY(i, ridge);          // top row
      hp.setY(i + segs + 1, -4);  // bottom row
    }
    geo.computeVertexNormals();
    const hill = mesh(geo, hillMat, { z: -120 - layer * 55 });
    hill.userData.keep = true;
    hill.userData.noShadow = true;
    group.add(hill);
  }

  const stone = mat('#c9c4b8', { map: tex('plaster', 6, 6), roughness: 0.95 });
  group.add(mesh(new THREE.BoxGeometry(4.2, 0.12, 22), stone, { y: 0.05, z: 7 }));
  group.add(mesh(new THREE.BoxGeometry(34, 0.12, 4), stone, { y: 0.05, z: -2.5 }));

  // The building.
  const b = new THREE.Group();
  const plaster = mat('#e9e1d0', { map: tex('plaster', 3, 1) });
  const plaster2 = mat('#ddd2bd', { map: tex('plaster', 2, 2) });
  const tiles = mat('#b0563e', { map: tex('tiles', 8, 3), roughness: 0.8 });
  const trim = mat('#f4efe4');
  const glass = new THREE.MeshPhysicalMaterial({ color: '#2e4156', roughness: 0.05, metalness: 0.2, envMapIntensity: 1.6 });
  const frame = mat('#3b3a37', { roughness: 0.6, metalness: 0.4 });

  const wingW = 26, wingH = 6.4, wingD = 7;
  b.add(mesh(new THREE.BoxGeometry(wingW, wingH, wingD), plaster, { y: wingH / 2 }));
  const roof = pitchedRoof(wingD + 0.8, 2.2, wingW + 0.8, tiles, 0.22);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = wingH;
  b.add(roof);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape([new THREE.Vector2(-wingD / 2, 0), new THREE.Vector2(wingD / 2, 0), new THREE.Vector2(0, 2.2)]);
    b.add(mesh(new THREE.ShapeGeometry(shape), plaster, { x: (side * wingW) / 2, y: wingH, ry: (side * Math.PI) / 2 }));
  }
  b.add(mesh(new THREE.BoxGeometry(wingW + 0.3, 0.35, wingD + 0.3), trim, { y: 3.2 }));

  // Central block, taller, with an entrance.
  const cW = 7.5, cH = 9.5, cD = 8.4;
  b.add(mesh(new THREE.BoxGeometry(cW, cH, cD), plaster2, { y: cH / 2, z: 0.8 }));
  const cRoof = pitchedRoof(cW + 0.8, 2.4, cD + 0.8, tiles, 0.22);
  cRoof.position.set(0, cH, 0.8);
  b.add(cRoof);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape([new THREE.Vector2(-cW / 2, 0), new THREE.Vector2(cW / 2, 0), new THREE.Vector2(0, 2.4)]);
    b.add(mesh(new THREE.ShapeGeometry(shape), plaster2, { y: cH, z: 0.8 + (side * cD) / 2, ry: side < 0 ? Math.PI : 0 }));
  }

  // Windows: dark glass that reflects the sky, in frames, with sills.
  const win = (x, y, z, w, h) => {
    b.add(mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.08), frame, { x, y, z }));
    b.add(mesh(new THREE.BoxGeometry(w, h, 0.1), glass, { x, y, z: z + 0.02 }));
    b.add(mesh(new THREE.BoxGeometry(0.06, h, 0.12), frame, { x, y, z: z + 0.03 }));
    b.add(mesh(new THREE.BoxGeometry(w + 0.5, 0.12, 0.3), trim, { x, y: y - h / 2 - 0.12, z: z + 0.1 }));
  };
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      const x = -wingW / 2 + 1.4 + col * 2.1;
      if (Math.abs(x) < cW / 2 + 0.6) continue;
      win(x, 1.6 + row * 3.1, wingD / 2 + 0.01, 1.1, 1.6);
    }
  }
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) win(-2.2 + col * 2.2, 3.5 + row * 2.4, 0.8 + cD / 2 + 0.01, 1.2, 1.6);

  // Entrance: door, canopy, columns and steps.
  b.add(mesh(new THREE.BoxGeometry(2.6, 2.6, 0.12), glass, { y: 1.3, z: 0.8 + cD / 2 + 0.02 }));
  b.add(mesh(new THREE.BoxGeometry(5.4, 0.25, 2.4), trim, { y: 3, z: 0.8 + cD / 2 + 1.1 }));
  for (const sx of [-2.3, 2.3]) b.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 3, 16), trim, { x: sx, y: 1.5, z: 0.8 + cD / 2 + 2 }));
  for (let i = 0; i < 4; i++) b.add(mesh(new THREE.BoxGeometry(6.4 - i * 0.4, 0.2, 1.2 - i * 0.2), stone, { y: 0.1 + i * 0.2, z: 0.8 + cD / 2 + 2.6 - i * 0.3 }));

  // Flagpole.
  b.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 9, 10), mat('#c8ccd2', { metalness: 0.7, roughness: 0.35 }), { x: 6.5, y: 4.5, z: 9 }));
  const flag = new THREE.Group();
  flag.position.set(6.5, 8.4, 9);
  const flagGeo = new THREE.PlaneGeometry(2.4, 1.4, 16, 6);
  flagGeo.translate(1.2, 0, 0);
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 240; flagCanvas.height = 140;
  const fc = flagCanvas.getContext('2d');
  fc.fillStyle = '#1f5fbf'; fc.fillRect(0, 0, 240, 140);
  fc.fillStyle = '#fff'; fc.fillRect(0, 47, 240, 46);
  fc.fillStyle = '#1f5fbf';
  for (const [sx, sy] of [[120, 70], [100, 60], [140, 60], [100, 80], [140, 80]]) { fc.beginPath(); fc.arc(sx, sy, 4, 0, Math.PI * 2); fc.fill(); }
  const flagTex = new THREE.CanvasTexture(flagCanvas);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  const flagMesh = mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }));
  flag.add(flagMesh);
  flag.userData.dynamic = true;
  b.add(flag);
  const flagBase = flagGeo.attributes.position.array.slice();

  b.position.z = -9;
  group.add(b);

  // Trees, lamps and benches.
  for (const [x, z, h] of [[-17, -1, 8], [-21, 5, 9], [18, 0, 8.5], [22, 6, 9.5], [-12, 13, 7], [12, 14, 7.5], [-28, -8, 10], [27, -10, 10], [-6, 22, 8], [8, 26, 9]]) {
    const t = leafyTree(r, h, r() > 0.5 ? '#6a9a4c' : '#5c8c44');
    t.position.set(x, height(x, z), z);
    t.rotation.y = r() * 6;
    group.add(t);
  }
  const iron = mat('#2c2c2e', { roughness: 0.5, metalness: 0.6 });
  const lampGlass = mat('#fff2d0', { emissive: '#ffd690', emissiveIntensity: 0.6 });
  for (const [x, z] of [[-3, 3], [3, 3], [-3, 11], [3, 11], [-10, -0.5], [10, -0.5]]) {
    group.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 8), iron, { x, y: 2, z }));
    group.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), lampGlass, { x, y: 4.1, z }));
  }
  const wood = mat('#8a6a4b', { map: tex('planks', 1, 1) });
  for (const [x, z, ry] of [[-6, 6, Math.PI / 2], [6, 6, -Math.PI / 2]]) {
    const bench = new THREE.Group();
    bench.add(mesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), wood, { y: 0.55 }));
    bench.add(mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), wood, { y: 0.85, z: -0.28 }));
    for (const sx of [-0.95, 0.95]) bench.add(mesh(new THREE.BoxGeometry(0.08, 0.55, 0.55), iron, { x: sx, y: 0.28 }));
    bench.position.set(x, 0, z);
    bench.rotation.y = ry;
    group.add(bench);
  }

  shadows(group);
  ground.castShadow = false;
  bake(group);

  function update(t) {
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = flagBase[i * 3];
      p.setZ(i, Math.sin(x * 2.2 - t * 4) * 0.12 * (x / 2.4));
    }
    p.needsUpdate = true;
    flagGeo.computeVertexNormals();
  }

  return { group, update };
}
