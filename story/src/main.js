import * as THREE from 'three';
import './style.css';
import { buildKaukira } from './scenes/kaukira.js';
import { buildUniversity } from './scenes/university.js';
import { buildClassroom } from './scenes/classroom.js';
import { buildGlobe, latLon } from './scenes/globe.js';
import { buildSweden } from './scenes/sweden.js';
import { buildTitan } from './scenes/titan.js';
import { buildNow } from './scenes/now.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = matchMedia('(max-width: 900px)');
const chapters = [...document.querySelectorAll('.chapter')];
const idx = Object.fromEntries(chapters.map((s, i) => [s.dataset.station, i]));

// ── Scroll → chapter position ───────────────────────────────────────────────
// Chapter i is "at rest" when its centre sits on the reading line. Between
// two rest points the position runs linearly from i to i + 1.

let restY = [];
function readingLine() {
  return innerHeight * 0.5;
}
function measure() {
  restY = chapters.map((c) => {
    const r = c.getBoundingClientRect();
    return r.top + scrollY + r.height / 2 - readingLine();
  });
}
function scrollF() {
  const y = scrollY;
  if (y <= restY[0]) return 0;
  for (let i = 0; i < restY.length - 1; i++) {
    if (y < restY[i + 1]) return i + (y - restY[i]) / (restY[i + 1] - restY[i]);
  }
  return restY.length - 1;
}
function goTo(i) {
  measure();
  scrollTo({ top: Math.max(0, restY[i]), behavior: reduceMotion ? 'auto' : 'smooth' });
}

// ── Palettes ────────────────────────────────────────────────────────────────

const P = (o) => ({
  ...o,
  skyTop: new THREE.Color(o.skyTop),
  skyBottom: new THREE.Color(o.skyBottom),
  fog: new THREE.Color(o.skyBottom),
  sun: new THREE.Color(o.sun),
  hemiSky: new THREE.Color(o.hemiSky),
  hemiGround: new THREE.Color(o.hemiGround),
});
const PALETTES = {
  sunset: P({ skyTop: '#46507e', skyBottom: '#f2b28a', fogNear: 110, fogFar: 330, sun: '#ffd6ad', sunI: 2.3, hemiSky: '#ffe2c8', hemiGround: '#46536e', hemiI: 1.15, stars: 0, sunDisc: 1, aurora: 0 }),
  day: P({ skyTop: '#86acd4', skyBottom: '#dfe9f1', fogNear: 100, fogFar: 260, sun: '#fff7ec', sunI: 2.4, hemiSky: '#e6f0f8', hemiGround: '#6b7560', hemiI: 1.25, stars: 0, sunDisc: 0, aurora: 0 }),
  golden: P({ skyTop: '#8d9cc4', skyBottom: '#f1dfc6', fogNear: 100, fogFar: 260, sun: '#ffe6c2', sunI: 2.3, hemiSky: '#fff0dc', hemiGround: '#6a5a48', hemiI: 1.25, stars: 0, sunDisc: 0, aurora: 0 }),
  space: P({ skyTop: '#070b16', skyBottom: '#121c33', fogNear: 120, fogFar: 280, sun: '#bcd4ff', sunI: 1.1, hemiSky: '#8fa8ff', hemiGround: '#101828', hemiI: 0.6, stars: 0.8, sunDisc: 0, aurora: 0 }),
  nordic: P({ skyTop: '#0b1528', skyBottom: '#26425e', fogNear: 100, fogFar: 260, sun: '#a9c2ff', sunI: 1.2, hemiSky: '#a9c2ff', hemiGround: '#1d2735', hemiI: 1.1, stars: 0.7, sunDisc: 0, aurora: 1 }),
  titan: P({ skyTop: '#0b0f1c', skyBottom: '#20264a', fogNear: 110, fogFar: 270, sun: '#c8d0ff', sunI: 1.1, hemiSky: '#a9b8ff', hemiGround: '#141a30', hemiI: 0.9, stars: 0.6, sunDisc: 0, aurora: 0 }),
  dusk: P({ skyTop: '#100e1c', skyBottom: '#2c2446', fogNear: 110, fogFar: 270, sun: '#d6c8ff', sunI: 1.3, hemiSky: '#b9a8ff', hemiGround: '#1a1530', hemiI: 0.9, stars: 0.5, sunDisc: 0, aurora: 0 }),
};
const NUM_KEYS = ['fogNear', 'fogFar', 'sunI', 'hemiI', 'stars', 'sunDisc', 'aurora'];
const COLOR_KEYS = ['skyTop', 'skyBottom', 'fog', 'sun', 'hemiSky', 'hemiGround'];
function mixPalette(out, a, b, t) {
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (const k of COLOR_KEYS) out[k].copy(a[k]).lerp(b[k], t);
  return out;
}

// ── Stations: where the camera rests for each chapter ──────────────────────
// A long lens (small field of view) keeps the scenes calm and flat.

const FOV = 26;
const X = { kaukira: 0, university: 90, classroom: 180, globe: 270, sweden: 360, titan: 450, now: 540 };
const G = new THREE.Vector3(X.globe, 0, 0);
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;
function orbit(look, dist, pitch, yaw) {
  return look.clone().add(v(Math.sin(yaw * DEG) * Math.cos(pitch * DEG), Math.sin(pitch * DEG), Math.cos(yaw * DEG) * Math.cos(pitch * DEG)).multiplyScalar(dist));
}
function station(look, dist, pitch, yaw, palette) {
  return { pos: orbit(look, dist, pitch, yaw), look, palette };
}
const STATIONS = {
  hero: station(v(-17, 4, -6), 104, 9, 6, 'sunset'),
  kaukira: station(v(-1, 2, 0), 96, 14, 20, 'sunset'),
  university: station(v(X.university, 3, 0), 100, 18, -14, 'day'),
  teacher: station(v(X.classroom, 3, -1), 94, 21, 12, 'golden'),
  remote: { pos: G.clone().add(latLon(22, -80, 82)), look: G, palette: 'space' },
  move: { pos: G.clone().add(latLon(40, -40, 86)), look: G, palette: 'space' },
  sweden: station(v(X.sweden, 3, 0), 102, 17, 14, 'nordic'),
  titan: station(v(X.titan, 5, 0), 62, 4, -6, 'titan'),
  now: station(v(X.now, 3.5, 0), 74, 5, 0, 'dusk'),
};
const keys = chapters.map((s) => STATIONS[s.dataset.station]);
// The hero frames the village to the right of the big name on wide screens,
// and centred above it on phones.
const HERO = { wide: station(v(-17, 4, -6), 104, 9, 6, 'sunset'), narrow: station(v(-1, 4, -6), 112, 9, 6, 'sunset') };
function frameHero() {
  const h = mobileQuery.matches ? HERO.narrow : HERO.wide;
  STATIONS.hero.pos.copy(h.pos);
  STATIONS.hero.look.copy(h.look);
}

function start(renderer) {
  let dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const palette = mixPalette(P(PALETTES.sunset), PALETTES.sunset, PALETTES.sunset, 0);
  scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 1200);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: palette.skyTop.clone() }, bottom: { value: palette.skyBottom.clone() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom;
      void main(){ float h = pow(smoothstep(0.0, 0.5, vP.y), 0.8); gl_FragColor = vec4(mix(bottom, top, h), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
  sky.renderOrder = -2;
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000; i++) {
    const s = new THREE.Vector3().randomDirection();
    s.y = Math.abs(s.y) * 0.9 + 0.05;
    s.normalize().multiplyScalar(550);
    starPos.set([s.x, s.y, s.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.renderOrder = -1;
  scene.add(stars);

  const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemiI);
  const sun = new THREE.DirectionalLight(palette.sun, palette.sunI);
  scene.add(hemi, sun, sun.target);

  const worlds = [
    [buildKaukira(), X.kaukira],
    [buildUniversity(), X.university],
    [buildClassroom(), X.classroom],
    [buildGlobe(), X.globe],
    [buildSweden(), X.sweden],
    [buildTitan(), X.titan],
    [buildNow(), X.now],
  ].map(([w, x]) => {
    w.group.position.x = x;
    scene.add(w.group);
    return w;
  });
  const globe = worlds[3];

  // Globe labels as HTML over the scene.
  const labelsEl = document.getElementById('labels');
  const labels = Object.entries(globe.pins).map(([key, p]) => {
    const el = document.createElement('div');
    el.className = 'pin-label';
    el.style.setProperty('--c', p.color);
    el.textContent = p.label;
    labelsEl.appendChild(el);
    return { key, p, el };
  });
  const labelWindow = { kaukira: ['remote', 'move'], usa: ['remote', 'remote'], goteborg: ['move', 'move'] };

  let W = 1, H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Tall screens get a slightly wider lens so the scenes still fit.
    camera.fov = camera.aspect < 0.85 ? FOV / Math.pow(camera.aspect / 0.85, 0.7) : FOV;
    // The story sits on the left (desktop) or the bottom (phones), so the
    // scene's centre moves right or up to stay clear of it.
    if (mobileQuery.matches) camera.setViewOffset(W, H, 0, H * 0.2, W, H);
    else camera.setViewOffset(W, H, -W * 0.22, 0, W, H);
    camera.updateProjectionMatrix();
    frameHero();
    measure();
  }
  addEventListener('resize', resize);
  resize();
  document.fonts?.ready.then(measure);

  let f = scrollF();
  let t = 0;
  let last = performance.now();
  let slowFrames = 0;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const world = new THREE.Vector3();
  const lightOffset = new THREE.Vector3(-30, 50, 30);
  const smooth = (e0, e1, x) => {
    const k = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
    return k * k * (3 - 2 * k);
  };
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.05);
    last = now;

    // If frames are slow for a while, render fewer pixels.
    if (rawDt > 0.024 && rawDt < 0.2) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      slowFrames = 0;
    }

    t += dt * (reduceMotion ? 0.25 : 1);
    const target = scrollF();
    // Follow the scroll closely; just enough smoothing to hide wheel steps.
    f = reduceMotion ? target : f + (target - f) * (1 - Math.exp(-dt * 12));
    if (Math.abs(target - f) < 0.0005) f = target;

    const i = Math.min(Math.floor(f), keys.length - 1);
    const j = Math.min(i + 1, keys.length - 1);
    const e = smooth(0.15, 0.85, f - i);
    const a = keys[i], b = keys[j];

    pos.lerpVectors(a.pos, b.pos, e);
    look.lerpVectors(a.look, b.look, e);
    if (a.look === G && b.look === G) {
      tmp.copy(pos).sub(G);
      tmp.setLength(a.pos.distanceTo(G) * (1 - e) + b.pos.distanceTo(G) * e);
      pos.copy(G).add(tmp);
    }
    camera.position.copy(pos);
    camera.lookAt(look);

    mixPalette(palette, PALETTES[a.palette], PALETTES[b.palette], e);
    skyMat.uniforms.top.value.copy(palette.skyTop);
    skyMat.uniforms.bottom.value.copy(palette.skyBottom);
    scene.fog.color.copy(palette.fog);
    // A brief haze between chapters; scenes swap while it is thick.
    const haze = a === b ? 0 : Math.pow(Math.sin(Math.PI * e), 1.5);
    scene.fog.near = palette.fogNear * (1 - haze);
    scene.fog.far = palette.fogFar + (30 - palette.fogFar) * haze;
    hemi.color.copy(palette.hemiSky);
    hemi.groundColor.copy(palette.hemiGround);
    hemi.intensity = palette.hemiI;
    sun.color.copy(palette.sun);
    sun.intensity = palette.sunI;
    sun.target.position.copy(look);
    sun.position.copy(look).add(lightOffset);
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    stars.material.opacity = palette.stars;

    const info = { f, idx, palette, pixelH: H * dpr };
    for (const w of worlds) {
      w.group.visible = Math.abs(camera.position.x - w.group.position.x) < 45;
      if (w.group.visible) w.update(t, dt * (reduceMotion ? 0.25 : 1), info);
    }

    // Globe labels.
    tmp.copy(camera.position).sub(G).normalize();
    for (const { key, p, el } of labels) {
      const [from, to] = labelWindow[key];
      const near = Math.max(0, 1 - Math.max(idx[from] - 0.2 - f, f - idx[to] - 0.2, 0) * 5);
      const facing = world.copy(p.local).normalize().dot(tmp);
      const opacity = near * smooth(0.2, 0.5, facing);
      el.style.opacity = opacity.toFixed(3);
      if (opacity > 0.01) {
        world.copy(p.local).add(G).project(camera);
        el.style.transform = `translate(${((world.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-world.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      }
    }

    setActive(Math.round(f));

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  document.documentElement.classList.add('ready');
}

// ── Page chrome ─────────────────────────────────────────────────────────────

const credits = document.getElementById('credits');
const creditItems = chapters.map((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="n">${String(i).padStart(2, '0')}</span><span class="t">${c.dataset.title}</span>`;
  b.addEventListener('click', () => goTo(i));
  credits.appendChild(b);
  return b;
});
let activeIndex = -1;
function setActive(i) {
  if (i === activeIndex) return;
  activeIndex = i;
  chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
  creditItems.forEach((b, k) => {
    b.classList.toggle('on', k === i);
    b.classList.toggle('past', k < i);
  });
  document.body.dataset.chapter = chapters[i].dataset.station;
}

// In-page links land where the chapter's scene is at rest.
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[href^="#"]');
  if (!a) return;
  const i = chapters.findIndex((c) => '#' + c.id === a.getAttribute('href'));
  if (i < 0) return;
  ev.preventDefault();
  goTo(i);
  history.replaceState(null, '', a.getAttribute('href'));
});

measure();
setActive(Math.round(scrollF()));
addEventListener('scroll', () => {
  if (!document.documentElement.classList.contains('ready')) setActive(Math.round(scrollF()));
}, { passive: true });

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  console.warn('WebGL unavailable, showing the story without 3D.', err);
  document.documentElement.classList.add('no-webgl');
}
if (renderer) start(renderer);
