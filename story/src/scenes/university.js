import * as THREE from 'three';
import { rng, mat, mesh, island, canvasTexture, roundTree, person, gradCap, book, bake } from './common.js';

const CODE = [
  '#include <stdio.h>',
  '',
  'int main(void) {',
  '  int i;',
  '  for (i = 1; i <= 10; i++) {',
  '    printf("%d\\n", i * i);',
  '  }',
  '  return 0;',
  '}',
  '',
  'SELECT nombre, nota',
  '  FROM estudiantes',
  ' WHERE nota >= 60',
  ' ORDER BY nota DESC;',
  '',
  'class Nodo {',
  '  int valor;',
  '  Nodo *siguiente;',
  '};',
  '',
  '<?php echo "Hola, mundo"; ?>',
  '',
];

// University: a campus building, a desk with an old CRT and a graduation cap.
export function buildUniversity() {
  const r = rng(11);
  const group = new THREE.Group();
  group.add(island(16, '#79b45c', '#7a5b3e', 5));

  // Path and plaza.
  group.add(mesh(new THREE.BoxGeometry(3.2, 0.06, 12), mat('#d9d2c3'), { y: 0.03, z: 3 }));
  group.add(mesh(new THREE.BoxGeometry(18, 0.06, 2.6), mat('#d9d2c3'), { y: 0.03, z: -2.4 }));

  // Campus building.
  const b = new THREE.Group();
  const wall = mat('#ebe4d4');
  b.add(mesh(new THREE.BoxGeometry(17, 5.4, 4.6), wall, { y: 2.7 }));
  b.add(mesh(new THREE.BoxGeometry(5.6, 8, 5.4), mat('#e2d9c6'), { y: 4, z: 0.4 }));
  b.add(mesh(new THREE.BoxGeometry(17.6, 0.35, 5), mat('#b5523b'), { y: 5.55 }));
  b.add(mesh(new THREE.BoxGeometry(6, 0.35, 5.8), mat('#b5523b'), { y: 8.15, z: 0.4 }));
  const glass = mat('#86b7d9', { roughness: 0.2, metalness: 0.3, emissive: '#1b3550', emissiveIntensity: 0.3 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
      const x = -7.6 + col * 1.69;
      if (Math.abs(x) < 3) continue;
      b.add(mesh(new THREE.BoxGeometry(1, 1.3, 0.08), glass, { x, y: 1.6 + row * 2.2, z: 2.32 }));
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      b.add(mesh(new THREE.BoxGeometry(1.1, 1.4, 0.08), glass, { x: -1.6 + col * 1.6, y: 3.1 + row * 1.6, z: 3.12 }));
    }
  }
  b.add(mesh(new THREE.BoxGeometry(2, 2.2, 0.1), mat('#5d4532'), { y: 1.1, z: 3.13 }));
  for (let i = 0; i < 3; i++) b.add(mesh(new THREE.BoxGeometry(4.5 - i * 0.6, 0.22, 1 - i * 0.25), mat('#cfc6b4'), { y: 0.11 + i * 0.22, z: 3.6 - i * 0.2 }));
  // Flagpole.
  b.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 5), mat('#c8ccd2'), { x: 4.4, y: 10.3, z: 0.4 }));
  const flag = new THREE.Group();
  flag.position.set(4.4, 12.2, 0.4);
  const stripe = (c, y) => mesh(new THREE.BoxGeometry(1.8, 0.33, 0.03), mat(c), { x: 0.9, y });
  flag.add(stripe('#1f5fbf', 0.33), stripe('#ffffff', 0), stripe('#1f5fbf', -0.33));
  flag.userData.dynamic = true;
  b.add(flag);
  b.position.z = -6;
  group.add(b);

  // Trees.
  for (const [x, z] of [[-11, -1], [-12.5, 4], [11, 0], [12, 5.5], [-8.5, 8], [8, 9]]) {
    const t = roundTree(r, 3.5 + r() * 1.5, r() > 0.5 ? '#5c9e4a' : '#4c8a3e');
    t.position.set(x, 0, z);
    group.add(t);
  }

  // Desk with a CRT computer.
  const desk = new THREE.Group();
  desk.add(mesh(new THREE.BoxGeometry(3.4, 0.14, 1.7), mat('#a7774f'), { y: 1.5 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) desk.add(mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), mat('#6e4d33'), { x: sx * 1.55, y: 0.75, z: sz * 0.7 }));
  desk.add(mesh(new THREE.BoxGeometry(1.9, 1.55, 1.6), mat('#d8d0bc'), { y: 2.37, z: -0.15 }));
  desk.add(mesh(new THREE.BoxGeometry(1.2, 1.0, 0.7), mat('#cbc2ad'), { y: 2.3, z: -1.2 }));
  const screen = canvasTexture(512, 384, (ctx, w, h, t = 0) => {
    ctx.fillStyle = '#04140a';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#6dff9c';
    const lineH = 28;
    const offset = (t * 22) % (CODE.length * lineH);
    for (let i = 0; i < 18; i++) {
      const y = i * lineH - (offset % lineH) + 30;
      const idx = (Math.floor(offset / lineH) + i) % CODE.length;
      ctx.fillText(CODE[idx], 22, y);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  });
  const scr = mesh(new THREE.PlaneGeometry(1.55, 1.15), new THREE.MeshBasicMaterial({ map: screen.texture }), { y: 2.4, z: 0.66 });
  desk.add(scr);
  desk.add(mesh(new THREE.BoxGeometry(1.7, 0.08, 0.6), mat('#cfc7b2'), { y: 1.62, z: 0.5 }));
  const lamp = new THREE.PointLight('#7dffb0', 3, 5, 2);
  lamp.position.set(0, 2.4, 1.3);
  desk.add(lamp);
  desk.position.set(5.5, 0, 6);
  desk.rotation.y = -0.45;
  group.add(desk);

  const student = person('#2f6db5', '#7a4a2e');
  student.position.set(3.3, 0, 7.6);
  student.rotation.y = 2.2;
  group.add(student);

  // Books and the floating graduation cap.
  const stack = new THREE.Group();
  ['#a23b3b', '#2f5f8a', '#d1a23f', '#3f7a52'].forEach((c, i) => {
    const bk = book(c);
    bk.position.y = 0.11 + i * 0.23;
    bk.rotation.y = (r() - 0.5) * 0.6;
    stack.add(bk);
  });
  stack.position.set(-5, 0, 6.5);
  group.add(stack);
  const cap = gradCap();
  cap.userData.dynamic = true;
  cap.scale.setScalar(1.3);
  group.add(cap);

  bake(group);

  let lastFrame = -1;
  function update(t) {
    const frame = Math.floor(t * 10);
    if (frame !== lastFrame) {
      lastFrame = frame;
      screen.redraw(t);
    }
    cap.position.set(-5, 3.2 + Math.sin(t * 1.4) * 0.35, 6.5);
    cap.rotation.y = t * 0.6;
    cap.rotation.z = Math.sin(t * 0.9) * 0.12;
    flag.rotation.y = Math.sin(t * 1.7) * 0.2;
  }

  return { group, update, radius: 30 };
}
