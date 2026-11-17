import * as THREE from 'three';
import { rng, mat, mesh, canvasTexture, palm, pine, gradCap, book, glowSprite } from './common.js';

const SESSION = [
  { p: '$ ', text: 'whoami' },
  { p: '', text: 'cristian · senior frontend developer · Göteborg' },
  { p: '$ ', text: 'cat origin.txt' },
  { p: '', text: 'Kaukira, La Mosquitia, Honduras' },
  { p: '$ ', text: 'ls ~/projects' },
  { p: '', text: 'titan/  notas/  svenska/  codequest/' },
  { p: '$ ', text: 'echo "always learning, always building"' },
  { p: '', text: 'always learning, always building' },
  { p: '$ ', text: '' },
];

// Today: a floating terminal with the things that came along on the way.
export function buildNow() {
  const r = rng(77);
  const group = new THREE.Group();

  const total = SESSION.reduce((n, l) => n + l.text.length + 4, 0);
  const term = canvasTexture(1024, 640, (ctx, w, h, typed = 0, blink = true) => {
    ctx.fillStyle = '#12111c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1b2c';
    ctx.fillRect(0, 0, w, 54);
    ['#ff6b6b', '#ffcf5c', '#5cd18a'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(34 + i * 30, 27, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#8f8aa8';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('~ — zsh', w / 2 - 50, 35);
    ctx.font = '30px "JetBrains Mono", monospace';
    let left = typed;
    let y = 110;
    let cursor = null;
    for (const l of SESSION) {
      if (left <= 0) break;
      const shown = l.text.slice(0, Math.max(0, left - 2));
      left -= l.text.length + 4;
      ctx.fillStyle = '#8ff0c4';
      ctx.fillText(l.p, 40, y);
      const px = 40 + ctx.measureText(l.p).width;
      ctx.fillStyle = l.p ? '#f2eee3' : '#b7b0d6';
      ctx.fillText(shown, px, y);
      cursor = [px + ctx.measureText(shown).width + 4, y];
      y += 54;
    }
    if (cursor && blink) {
      ctx.fillStyle = '#8ff0c4';
      ctx.fillRect(cursor[0], cursor[1] - 26, 16, 32);
    }
  });

  const monolith = new THREE.Group();
  monolith.add(mesh(new THREE.BoxGeometry(17, 11, 0.7), mat('#262433', { roughness: 0.5, metalness: 0.3 })));
  monolith.add(mesh(new THREE.PlaneGeometry(16.2, 10.15), new THREE.MeshBasicMaterial({ map: term.texture, toneMapped: false }), { z: 0.36 }));
  const glow = glowSprite('#8f7bff', 40, 0.35);
  glow.position.z = -2;
  monolith.add(glow);
  monolith.position.y = 4;
  group.add(monolith);

  // Mementos orbiting the terminal: a palm, a pine, a cap, a book, a canoe.
  const orbiters = [];
  const items = [
    (() => { const p = palm(r, 3); p.scale.setScalar(0.6); return p; })(),
    (() => { const p = pine(r, 3); p.scale.setScalar(0.7); return p; })(),
    gradCap(),
    book('#d1a23f'),
    mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#6a4528', { side: THREE.DoubleSide }), { s: [1.4, 0.32, 0.36] }),
    mesh(new THREE.IcosahedronGeometry(0.6, 0), mat('#8ff0c4', { emissive: '#2f8f6a', emissiveIntensity: 0.6 })),
  ];
  items.forEach((it, i) => {
    const holder = new THREE.Group();
    holder.add(it);
    holder.userData = { a: (i / items.length) * Math.PI * 2, rad: 12 + (i % 2) * 2, y: 1 + (i % 3) * 2.6, spin: 0.3 + r() * 0.5 };
    group.add(holder);
    orbiters.push(holder);
  });

  // Floating dust.
  const N = 500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (r() - 0.5) * 70;
    pos[i * 3 + 1] = (r() - 0.3) * 30;
    pos[i * 3 + 2] = (r() - 0.5) * 50;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#b9a8ff', size: 0.12, transparent: true, opacity: 0.7, depthWrite: false }));
  group.add(dust);

  let lastKey = '';
  function update(t, dt, info) {
    const start = info.idx.now - 0.6;
    const typed = Math.floor(THREE.MathUtils.clamp((info.f - start) / 0.6, 0, 1) * total);
    const blink = Math.floor(t * 2) % 2 === 0;
    const key = typed + ':' + blink;
    if (key !== lastKey) {
      lastKey = key;
      term.redraw(typed, blink);
    }
    monolith.position.y = 4 + Math.sin(t * 0.8) * 0.25;
    monolith.rotation.y = Math.sin(t * 0.3) * 0.06;
    for (const o of orbiters) {
      const u = o.userData;
      const a = u.a + t * 0.12;
      // A tilted ring: low in front of the screen, high behind it.
      o.position.set(Math.cos(a) * u.rad, 4 - Math.sin(a) * 8 + Math.sin(t + u.a) * 0.4, Math.sin(a) * u.rad * 0.5 - 1);
      o.rotation.y = t * u.spin;
    }
    dust.rotation.y = t * 0.01;
  }

  return { group, update, radius: 40 };
}
