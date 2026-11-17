import * as THREE from 'three';
import { rng, mat, mesh, canvasTexture, tex, book, bake, shadows } from './common.js';

// The classroom at UNITEC, empty at the end of the day, late sun through the
// windows and the last lesson still on the board.

const ROOM = { x0: -12, x1: 8, z0: -8, z1: 46, h: 8.5 };
const WINDOWS = [-3.5, 2.5, 8.5, 14.5, 20.5, 26.5, 32.5, 38.5]; // window centres along the left wall
const WIN = { w: 3.6, y0: 2.4, y1: 6.4 };

export function buildClassroom() {
  const r = rng(23);
  const group = new THREE.Group();
  const { x0, x1, z0, z1, h } = ROOM;

  const wall = mat('#e8dcc4', { map: tex('plaster', 3, 2) });
  const wainscot = mat('#7d5b3e', { map: tex('planks', 6, 1) });
  const floor = mat('#b98a5c', { map: tex('floor', 5, 6), roughness: 0.55 });
  const ceiling = mat('#efe7d8', { roughness: 1 });

  group.add(mesh(new THREE.BoxGeometry(x1 - x0, 0.2, z1 - z0), floor, { x: (x0 + x1) / 2, y: -0.1, z: (z0 + z1) / 2 }));
  group.add(mesh(new THREE.BoxGeometry(x1 - x0, 0.2, z1 - z0), ceiling, { x: (x0 + x1) / 2, y: h + 0.1, z: (z0 + z1) / 2 }));
  // Front wall (the board), back wall, right wall.
  group.add(mesh(new THREE.BoxGeometry(x1 - x0, h, 0.4), wall, { x: (x0 + x1) / 2, y: h / 2, z: z0 - 0.2 }));
  group.add(mesh(new THREE.BoxGeometry(x1 - x0, h, 0.4), wall, { x: (x0 + x1) / 2, y: h / 2, z: z1 + 0.2 }));
  group.add(mesh(new THREE.BoxGeometry(0.4, h, z1 - z0), wall, { x: x1 + 0.2, y: h / 2, z: (z0 + z1) / 2 }));
  // Left wall, built around the windows.
  const lx = x0 - 0.2;
  group.add(mesh(new THREE.BoxGeometry(0.4, WIN.y0, z1 - z0), wall, { x: lx, y: WIN.y0 / 2, z: (z0 + z1) / 2 }));
  group.add(mesh(new THREE.BoxGeometry(0.4, h - WIN.y1, z1 - z0), wall, { x: lx, y: (h + WIN.y1) / 2, z: (z0 + z1) / 2 }));
  const edges = [z0, ...WINDOWS.flatMap((c) => [c - WIN.w / 2, c + WIN.w / 2]), z1];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1];
    group.add(mesh(new THREE.BoxGeometry(0.4, WIN.y1 - WIN.y0, b - a), wall, { x: lx, y: (WIN.y0 + WIN.y1) / 2, z: (a + b) / 2 }));
  }
  // Wainscot along the walls.
  group.add(mesh(new THREE.BoxGeometry(x1 - x0, 1.2, 0.08), wainscot, { x: (x0 + x1) / 2, y: 0.6, z: z0 + 0.04 }));
  group.add(mesh(new THREE.BoxGeometry(0.08, 1.2, z1 - z0), wainscot, { x: x1 - 0.04, y: 0.6, z: (z0 + z1) / 2 }));

  // Window frames and glass.
  const frame = mat('#f2ede3', { roughness: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dfe9ef', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.12, envMapIntensity: 1 });
  for (const c of WINDOWS) {
    const y = (WIN.y0 + WIN.y1) / 2, hh = WIN.y1 - WIN.y0;
    const g = mesh(new THREE.BoxGeometry(0.04, hh, WIN.w), glass, { x: lx, y, z: c });
    g.castShadow = false;
    g.userData.noShadow = true;
    group.add(g);
    group.add(mesh(new THREE.BoxGeometry(0.16, 0.12, WIN.w), frame, { x: lx + 0.1, y, z: c }));
    group.add(mesh(new THREE.BoxGeometry(0.16, hh, 0.12), frame, { x: lx + 0.1, y, z: c }));
    group.add(mesh(new THREE.BoxGeometry(0.5, 0.12, WIN.w + 0.2), frame, { x: lx + 0.3, y: WIN.y0 - 0.06, z: c }));
  }

  // Shafts of light from the windows, along the sun (set in main.js).
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.04 }, uColor: { value: new THREE.Color('#ffd9a0') } },
    vertexShader: `attribute float aAlong; varying float vAlong; void main(){ vAlong = aAlong; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float vAlong; uniform float uOpacity; uniform vec3 uColor;
      void main(){ gl_FragColor = vec4(uColor * uOpacity * (1.0 - vAlong) * smoothstep(0.0, 0.08, vAlong), 1.0); }`,
  });
  const light = new THREE.Vector3(0.85, -0.3, -0.42).normalize(); // direction the light travels
  for (const c of WINDOWS) {
    const corners = [[WIN.y0, c - WIN.w / 2], [WIN.y0, c + WIN.w / 2], [WIN.y1, c + WIN.w / 2], [WIN.y1, c - WIN.w / 2]].map(([y, z]) => new THREE.Vector3(lx, y, z));
    // Run each ray until it reaches the floor.
    const far = corners.map((p) => p.clone().addScaledVector(light, Math.min(26, p.y / -light.y)));
    const pos = [], along = [];
    const quad = (a, b, cc, d, la, lb, lc, ld) => {
      pos.push(...a.toArray(), ...b.toArray(), ...cc.toArray(), ...a.toArray(), ...cc.toArray(), ...d.toArray());
      along.push(la, lb, lc, la, lc, ld);
    };
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      quad(corners[k], corners[k2], far[k2], far[k], 0, 0, 1, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    const shaft = new THREE.Mesh(geo, shaftMat);
    shaft.userData.keep = true;
    shaft.userData.noShadow = true;
    shaft.renderOrder = 2;
    group.add(shaft);
  }

  // The chalkboard and the lesson.
  const board = canvasTexture(1400, 520, (ctx, w, hgt) => {
    ctx.fillStyle = '#26382f';
    ctx.fillRect(0, 0, w, hgt);
    // Old chalk smudges.
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * hgt, 80 + r() * 160, 20 + r() * 40, r() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(244,241,230,0.9)';
    ctx.font = 'italic 50px Georgia, serif';
    ctx.fillText('Desarrollo Web — Clase 12', 50, 80);
    ctx.font = '34px "JetBrains Mono", monospace';
    ['<h1>Hola, mundo</h1>', 'function saludar(nombre) {', '  return `Hola, ${nombre}!`;', '}'].forEach((ln, i) => ctx.fillText(ln, 60, 160 + i * 54));
    ctx.fillStyle = 'rgba(255,215,140,0.9)';
    ctx.font = 'italic 40px Georgia, serif';
    ctx.fillText('Lean Startup:', 840, 170);
    ctx.fillStyle = 'rgba(244,241,230,0.9)';
    ctx.fillText('Construir → Medir', 840, 240);
    ctx.fillText('→ Aprender ↺', 870, 300);
  });
  const boardY = 4.6;
  group.add(mesh(new THREE.BoxGeometry(13.4, 4.9, 0.18), mat('#5e4430', { map: tex('planks', 4, 1) }), { x: -2, y: boardY, z: z0 + 0.1 }));
  group.add(mesh(new THREE.PlaneGeometry(12.8, 4.4), new THREE.MeshStandardMaterial({ map: board.texture, roughness: 0.95 }), { x: -2, y: boardY, z: z0 + 0.2 }));
  group.add(mesh(new THREE.BoxGeometry(12.8, 0.1, 0.3), mat('#5e4430'), { x: -2, y: boardY - 2.3, z: z0 + 0.32 }));
  for (let i = 0; i < 3; i++) group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), mat('#f4f1e6'), { x: -6 + i * 0.5, y: boardY - 2.22, z: z0 + 0.32, rz: Math.PI / 2 }));

  // Clock.
  const clock = new THREE.Group();
  clock.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 32), mat('#f9f7f0'), { rx: Math.PI / 2 }));
  clock.add(mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 32), mat('#2b2b33', { metalness: 0.4, roughness: 0.5 })));
  const hourHand = new THREE.Group(), minHand = new THREE.Group();
  hourHand.add(mesh(new THREE.BoxGeometry(0.06, 0.34, 0.03), mat('#2b2b33'), { y: 0.17, z: 0.08 }));
  minHand.add(mesh(new THREE.BoxGeometry(0.04, 0.5, 0.03), mat('#2b2b33'), { y: 0.25, z: 0.1 }));
  hourHand.rotation.z = -2.6;
  hourHand.userData.dynamic = minHand.userData.dynamic = true;
  clock.add(hourHand, minHand);
  clock.position.set(-10, 7, z0 + 0.1);
  group.add(clock);

  // Desks and chairs.
  const wood = mat('#c49a6c', { map: tex('floor', 1, 1), roughness: 0.55 });
  const metal = mat('#3d4046', { metalness: 0.7, roughness: 0.4 });
  const seat = mat('#8a5b3c', { map: tex('planks', 1, 1), roughness: 0.6 });
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -8.5 + col * 4.2 + (r() - 0.5) * 0.3, z = -0.5 + row * 4.2 + (r() - 0.5) * 0.3;
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(2.2, 0.08, 1.3), wood, { y: 1.85 }));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.85, 8), metal, { x: sx * 1.0, y: 0.92, z: sz * 0.55 }));
      g.add(mesh(new THREE.BoxGeometry(2, 0.05, 1.1), metal, { y: 1.45 }));
      // Chair.
      const ch = new THREE.Group();
      ch.add(mesh(new THREE.BoxGeometry(1.0, 0.07, 0.95), seat, { y: 1.1 }));
      ch.add(mesh(new THREE.BoxGeometry(1.0, 0.85, 0.07), seat, { y: 1.65, z: 0.48, rx: -0.08 }));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) ch.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), metal, { x: sx * 0.44, y: 0.55, z: sz * 0.42 }));
      ch.position.set((r() - 0.5) * 0.4, 0, 1.15 + r() * 0.35);
      ch.rotation.y = (r() - 0.5) * 0.35;
      g.add(ch);
      if (r() < 0.35) {
        const bk = book(['#7a3b33', '#2f4f6e', '#9b7a33', '#3f6a4c'][(r() * 4) | 0], 0.75, 0.08, 0.55);
        bk.position.set((r() - 0.5) * 1.2, 1.93, (r() - 0.5) * 0.4);
        bk.rotation.y = r() * 3;
        g.add(bk);
      }
      g.position.set(x, 0, z);
      group.add(g);
    }
  }

  // The teacher's desk, books, an apple and a laptop.
  const td = new THREE.Group();
  td.add(mesh(new THREE.BoxGeometry(4, 1.9, 1.8), mat('#6e4a30', { map: tex('planks', 3, 1) }), { y: 0.95 }));
  td.add(mesh(new THREE.BoxGeometry(4.2, 0.1, 2), wood, { y: 1.95 }));
  ['#2f4f6e', '#7a3b33', '#9b7a33'].forEach((c, i) => {
    const bk = book(c, 1.0, 0.18, 0.75);
    bk.position.set(-1.3, 2.09 + i * 0.19, -0.2);
    bk.rotation.y = i * 0.15;
    td.add(bk);
  });
  td.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), mat('#9c2a22', { roughness: 0.35 }), { x: 1.3, y: 2.18 }));
  td.add(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.75), metal, { x: 0.1, y: 2.02 }));
  td.add(mesh(new THREE.BoxGeometry(1.1, 0.72, 0.03), metal, { x: 0.1, y: 2.36, z: -0.37, rx: -0.25 }));
  td.position.set(3.2, 0, -5.2);
  group.add(td);

  // A bookshelf and a door on the right wall.
  const shelf = new THREE.Group();
  const shelfWood = mat('#6e4a30', { map: tex('planks', 1, 2) });
  shelf.add(mesh(new THREE.BoxGeometry(0.8, 4.4, 4), shelfWood, { y: 2.2 }));
  for (let k = 0; k < 4; k++) {
    let z = -1.8;
    while (z < 1.7) {
      const w = 0.15 + r() * 0.12;
      const hh = 0.6 + r() * 0.3;
      shelf.add(mesh(new THREE.BoxGeometry(0.55, hh, w), mat(['#7a3b33', '#2f4f6e', '#9b7a33', '#3f6a4c', '#d8cfc0', '#5c4b6e'][(r() * 6) | 0], { roughness: 0.8 }), { x: -0.45, y: 0.35 + k * 1.05 + hh / 2, z: z + w / 2 }));
      z += w + 0.02;
    }
  }
  shelf.position.set(x1 - 0.4, 0, 4);
  group.add(shelf);
  group.add(mesh(new THREE.BoxGeometry(0.12, 5, 2.4), mat('#5b3f2b', { map: tex('planks', 2, 1) }), { x: x1 - 0.06, y: 2.5, z: 13 }));

  // Ceiling lamps (off; the sun does the work).
  for (const x of [-6, 2]) for (const z of [0, 10, 20, 30]) group.add(mesh(new THREE.BoxGeometry(1.4, 0.12, 3.2), mat('#f6f3ea', { emissive: '#fff4dd', emissiveIntensity: 0.15 }), { x, y: h - 0.06, z }));

  shadows(group);
  bake(group);

  function update(t) {
    minHand.rotation.z = -t * 0.08;
    hourHand.rotation.z = -2.6 - t * 0.0067;
  }

  return { group, update };
}
