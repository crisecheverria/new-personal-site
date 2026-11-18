import * as THREE from 'three';
import { rng, glowSprite } from './common.js';

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

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Today: a terminal. The window itself is HTML placed over the scene (so its
// text stays sharp); the scene supplies the glow and dust behind it.
export function buildNow() {
  const r = rng(77);
  const group = new THREE.Group();

  const el = document.createElement('div');
  el.className = 'mock term';
  el.innerHTML = '<div class="mock-win"><div class="mock-bar"><i></i><i></i><i></i><span>~ — zsh</span></div><pre class="term-body"></pre></div>';
  document.getElementById('screens').appendChild(el);
  const body = el.querySelector('.term-body');

  const anchor = new THREE.Group();
  anchor.position.y = 4;
  const glow = glowSprite('#8f7bff', 44, 0.4);
  glow.position.z = -2;
  anchor.add(glow);
  group.add(anchor);

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

  const total = SESSION.reduce((n, l) => n + l.text.length + 4, 0);
  let lastTyped = -1;
  function update(t, dt, info) {
    // The session types itself out as the chapter scrolls in.
    const typed = Math.floor(THREE.MathUtils.clamp((info.f - (info.idx.now - 0.4)) / 0.35, 0, 1) * total);
    if (typed !== lastTyped) {
      lastTyped = typed;
      let left = typed;
      const rows = [];
      for (const l of SESSION) {
        if (left <= 0) break;
        const shown = l.text.slice(0, Math.max(0, left - 2));
        left -= l.text.length + 4;
        rows.push(`<span class="p">${l.p}</span><span class="${l.p ? 'cmd' : 'out'}">${esc(shown)}</span>`);
      }
      body.innerHTML = rows.join('\n') + '<i class="caret"></i>';
    }
    anchor.position.y = 4 + Math.sin(t * 0.8) * 0.2;
    dust.rotation.y = t * 0.01;
  }

  return { group, update, overlay: { el, anchor, width: 17, station: 'now' } };
}
