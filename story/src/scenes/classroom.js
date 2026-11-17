import * as THREE from 'three';
import { rng, mat, mesh, island, canvasTexture, person, book, bake } from './common.js';

// The classroom: more than a decade teaching at UNITEC in San Pedro Sula.
export function buildClassroom() {
  const r = rng(23);
  const group = new THREE.Group();
  group.add(island(16, '#c99b6b', '#7a5b3e', 9));

  // Floor tiles.
  for (let i = -6; i <= 6; i++) group.add(mesh(new THREE.BoxGeometry(0.04, 0.02, 15), mat('#b88a5c'), { x: i * 1.6, y: 0.01, z: 0.5 }));

  // Walls.
  group.add(mesh(new THREE.BoxGeometry(22, 8.5, 0.5), mat('#efe5cf'), { y: 4.25, z: -7 }));
  group.add(mesh(new THREE.BoxGeometry(0.5, 8.5, 12), mat('#e7dcc4'), { x: -11, y: 4.25, z: -1.2 }));
  group.add(mesh(new THREE.BoxGeometry(22, 0.9, 0.55), mat('#9c7a58'), { y: 0.45, z: -6.95 }));
  // A window on the side wall, sunlight coming in.
  group.add(mesh(new THREE.BoxGeometry(0.1, 3, 4.5), mat('#bfe0f5', { emissive: '#ffe9b8', emissiveIntensity: 0.7 }), { x: -10.72, y: 4.6, z: 0 }));
  group.add(mesh(new THREE.BoxGeometry(0.14, 3.1, 0.12), mat('#f4f1e8'), { x: -10.68, y: 4.6, z: 0 }));
  group.add(mesh(new THREE.BoxGeometry(0.14, 0.12, 4.6), mat('#f4f1e8'), { x: -10.68, y: 4.6, z: 0 }));

  // Chalkboard with a lesson.
  const board = canvasTexture(1400, 520, (ctx, w, h, t = 0) => {
    ctx.fillStyle = '#1f3d33';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.sin(i * 91) * w * 0.5 + w / 2, Math.cos(i * 37) * h * 0.5 + h / 2, 160, 30);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4f1e6';
    ctx.font = 'italic 54px "Fraunces", Georgia, serif';
    ctx.fillText('Desarrollo Web — Clase 1', 50, 80);
    ctx.font = '36px "JetBrains Mono", monospace';
    const lines = [
      '<h1>Hola, mundo</h1>',
      'function saludar(nombre) {',
      '  return `Hola, ${nombre}!`;',
      '}',
    ];
    const reveal = Math.floor((t * 6) % 140);
    let count = 0;
    lines.forEach((ln, i) => {
      const shown = ln.slice(0, Math.max(0, reveal - count));
      count += ln.length;
      ctx.fillText(shown, 60, 160 + i * 56);
    });
    ctx.fillStyle = '#ffd36b';
    ctx.font = 'italic 40px "Fraunces", Georgia, serif';
    ctx.fillText('Lean Startup:', 830, 170);
    ctx.fillStyle = '#f4f1e6';
    ctx.fillText('Construir → Medir', 830, 240);
    ctx.fillText('→ Aprender ↺', 860, 300);
    ctx.strokeStyle = '#f4f1e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1080, 400, 70, 0, Math.PI * 1.7);
    ctx.stroke();
  });
  group.add(mesh(new THREE.BoxGeometry(14.6, 5.2, 0.2), mat('#6b4a32'), { y: 4.6, z: -6.68 }));
  group.add(mesh(new THREE.PlaneGeometry(14, 4.6), new THREE.MeshStandardMaterial({ map: board.texture, roughness: 1 }), { y: 4.6, z: -6.56 }));
  group.add(mesh(new THREE.BoxGeometry(14, 0.12, 0.35), mat('#6b4a32'), { y: 2.0, z: -6.45 }));

  // Wall clock.
  const clock = new THREE.Group();
  clock.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24), mat('#f9f7f0'), { rx: Math.PI / 2 }));
  clock.add(mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 24), mat('#2b2b33')));
  const hourHand = new THREE.Group();
  hourHand.add(mesh(new THREE.BoxGeometry(0.07, 0.38, 0.04), mat('#2b2b33'), { y: 0.19, z: 0.09 }));
  const minHand = new THREE.Group();
  minHand.add(mesh(new THREE.BoxGeometry(0.05, 0.55, 0.04), mat('#c0392b'), { y: 0.27, z: 0.11 }));
  hourHand.userData.dynamic = minHand.userData.dynamic = true;
  clock.add(hourHand, minHand);
  clock.position.set(8.8, 6.9, -6.68);
  group.add(clock);

  // Student desks and students.
  const shirts = ['#d4553f', '#2f6db5', '#e0a93b', '#3f8a5c', '#8a4fb5', '#e07a9a', '#4aa3b5', '#b56a3f', '#5b6bd4'];
  const skins = ['#8d5a3b', '#a66e47', '#6b4428', '#c08a63', '#7a4a2e'];
  const students = [];
  let k = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -6 + col * 4, z = -0.5 + row * 3.2;
      const d = new THREE.Group();
      d.add(mesh(new THREE.BoxGeometry(1.9, 0.1, 1.1), mat('#d8b384'), { y: 1.25 }));
      for (const sx of [-1, 1]) d.add(mesh(new THREE.BoxGeometry(0.08, 1.25, 0.9), mat('#55585f'), { x: sx * 0.85, y: 0.62 }));
      d.add(mesh(new THREE.BoxGeometry(1.2, 0.1, 0.9), mat('#55585f'), { y: 0.75, z: 1.05 }));
      d.position.set(x, 0, z);
      group.add(d);
      if (r() < 0.82) {
        const s = person(shirts[k % shirts.length], skins[k % skins.length], true);
        s.position.set(x, 0.75, z + 1.1);
        s.rotation.y = Math.PI;
        students.push(s);
        group.add(s);
        if (r() < 0.5) {
          const bk = book(shirts[(k + 3) % shirts.length], 0.7, 0.08, 0.5);
          bk.position.set(x + 0.3, 1.34, z);
          bk.rotation.y = r();
          group.add(bk);
        }
      }
      k++;
    }
  }
  // A raised hand.
  const asker = students[2];
  const arm = mesh(new THREE.CapsuleGeometry(0.1, 0.8, 2, 6), mat(shirts[2]), { x: 0.35, y: 1.95 });
  arm.userData.dynamic = true;
  if (asker) asker.add(arm);

  // Teacher's desk, the teacher, books and an apple.
  const td = new THREE.Group();
  td.add(mesh(new THREE.BoxGeometry(3.6, 1.4, 1.6), mat('#8a5f3d'), { y: 0.7 }));
  td.add(mesh(new THREE.BoxGeometry(3.8, 0.12, 1.8), mat('#a7774f'), { y: 1.46 }));
  ['#2f5f8a', '#a23b3b', '#d1a23f'].forEach((c, i) => {
    const bk = book(c, 1.0, 0.2, 0.75);
    bk.position.set(-1.1, 1.62 + i * 0.21, 0);
    bk.rotation.y = i * 0.2;
    td.add(bk);
  });
  td.add(mesh(new THREE.IcosahedronGeometry(0.22, 1), mat('#c0392b'), { x: 1.2, y: 1.72 }));
  td.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), mat('#3a3d46'), { x: 0.2, y: 1.55 }));
  td.add(mesh(new THREE.BoxGeometry(0.9, 0.6, 0.04), mat('#3a3d46'), { x: 0.2, y: 1.85, z: -0.3, rx: -0.2 }));
  td.position.set(5.5, 0, -3.8);
  group.add(td);
  const teacher = person('#f2efe6', '#8d5a3b');
  teacher.userData.dynamic = true;
  teacher.position.set(-2, 0, -4.8);
  group.add(teacher);
  const pointer = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), mat('#6b4a32'), { x: 0.5, y: 1.6, rz: 0.9 });
  teacher.add(pointer);

  bake(group);

  let lastStep = -1;
  function update(t) {
    const step = Math.floor(t * 6);
    if (step !== lastStep) {
      lastStep = step;
      board.redraw(t);
    }
    minHand.rotation.z = -t * 0.5;
    hourHand.rotation.z = -t * 0.5 / 12 - 1;
    arm.rotation.z = Math.sin(t * 3) * 0.15 - 0.15;
    teacher.position.x = -2 + Math.sin(t * 0.35) * 3;
    teacher.rotation.y = Math.cos(t * 0.35) > 0 ? 0.6 : -0.6;
    pointer.rotation.z = 0.9 + Math.sin(t * 1.5) * 0.2;
  }

  return { group, update, radius: 30 };
}
