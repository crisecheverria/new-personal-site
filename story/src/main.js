import * as THREE from 'three';
import './style.css';
import { buildKaukira } from './scenes/kaukira.js';
import { buildUniversity } from './scenes/university.js';
import { buildClassroom } from './scenes/classroom.js';
import { buildGlobe, latLon } from './scenes/globe.js';
import { buildSweden } from './scenes/sweden.js';
import { buildTitan } from './scenes/titan.js';
import { buildNow } from './scenes/now.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { N8AOPass } from 'n8ao';
import { LOW_POWER } from './scenes/common.js';

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
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  restY = chapters.map((c, i) => {
    // Phones: a chapter rests with its text starting halfway down the screen,
    // which leaves the top half to the scene.
    if (mobileQuery.matches && i > 0) {
      const top = c.querySelector('.inner').getBoundingClientRect().top + scrollY;
      return Math.min(maxScroll, top - innerHeight * 0.5);
    }
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
  sunDir: new THREE.Vector3(...o.sunDir).normalize(),
});
// sunDir points from the scene towards the sun; glow is how much the sky
// brightens around it; env is how strongly the sky lights every surface.
const PALETTES = {
  sunset: P({ skyTop: '#24306b', skyBottom: '#ff8b4d', fogNear: 160, fogFar: 420, sun: '#ffb877', sunI: 3.2, sunDir: [-0.208, 0.075, -0.978], glow: 1, env: 0.85, hemiSky: '#ffd9b8', hemiGround: '#3c4660', hemiI: 0.35, stars: 0, aurora: 0 }),
  day: P({ skyTop: '#3f79c4', skyBottom: '#cfe0ee', fogNear: 90, fogFar: 420, sun: '#fff1de', sunI: 4.4, sunDir: [0.55, 0.5, 0.6], glow: 0.25, env: 1.25, hemiSky: '#e6f0f8', hemiGround: '#6b7560', hemiI: 0.3, stars: 0, aurora: 0 }),
  golden: P({ skyTop: '#7489bf', skyBottom: '#f2d3ab', fogNear: 110, fogFar: 320, sun: '#ffcf96', sunI: 3.6, sunDir: [-0.85, 0.3, 0.42], glow: 0.7, env: 0.75, hemiSky: '#fff0dc', hemiGround: '#6a5a48', hemiI: 0.3, stars: 0, aurora: 0 }),
  space: P({ skyTop: '#070b16', skyBottom: '#121c33', fogNear: 120, fogFar: 280, sun: '#bcd4ff', sunI: 1.1, sunDir: [0.5, 0.5, 0.7], glow: 0, env: 0.3, hemiSky: '#8fa8ff', hemiGround: '#101828', hemiI: 0.6, stars: 0.8, aurora: 0 }),
  nordic: P({ skyTop: '#07101f', skyBottom: '#1e3a56', fogNear: 110, fogFar: 300, sun: '#a6bde9', sunI: 1.1, sunDir: [0.35, 0.55, -0.75], glow: 0.18, env: 0.7, hemiSky: '#a9c2ff', hemiGround: '#1d2735', hemiI: 0.45, stars: 0.75, aurora: 1 }),
  titan: P({ skyTop: '#0b0f1c', skyBottom: '#20264a', fogNear: 110, fogFar: 270, sun: '#c8d0ff', sunI: 1.1, sunDir: [0.3, 0.6, 0.7], glow: 0, env: 0.5, hemiSky: '#a9b8ff', hemiGround: '#141a30', hemiI: 0.9, stars: 0.6, aurora: 0 }),
  dusk: P({ skyTop: '#100e1c', skyBottom: '#2c2446', fogNear: 110, fogFar: 270, sun: '#d6c8ff', sunI: 1.3, sunDir: [0.3, 0.6, 0.7], glow: 0, env: 0.5, hemiSky: '#b9a8ff', hemiGround: '#1a1530', hemiI: 0.9, stars: 0.5, aurora: 0 }),
};
const NUM_KEYS = ['fogNear', 'fogFar', 'sunI', 'hemiI', 'stars', 'aurora', 'glow', 'env'];
const COLOR_KEYS = ['skyTop', 'skyBottom', 'fog', 'sun', 'hemiSky', 'hemiGround'];
function mixPalette(out, a, b, t) {
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (const k of COLOR_KEYS) out[k].copy(a[k]).lerp(b[k], t);
  out.sunDir.copy(a.sunDir).lerp(b.sunDir, t).normalize();
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
  kaukira: station(v(-1, 2.5, 0), 74, 8, 22, 'sunset'),
  university: station(v(X.university, 5, -5), 72, 5, -18, 'day'),
  teacher: station(v(X.classroom - 3, 3.8, -4), 45, 4, 9, 'golden'),
  remote: { pos: G.clone().add(latLon(24, -82, 72)), look: G, palette: 'space' },
  move: { pos: G.clone().add(latLon(42, -38, 76)), look: G, palette: 'space' },
  sweden: station(v(X.sweden, 5.5, -2), 82, 5, 16, 'nordic'),
  titan: station(v(X.titan, 5.4, 0), 50, 3, -4, 'titan'),
  now: station(v(X.now, 4, 0), 48, 3, 0, 'dusk'),
};
const keys = chapters.map((s) => STATIONS[s.dataset.station]);
// The hero frames the village to the right of the big name on wide screens,
// and centred above it on phones.
const HERO = { wide: station(v(-9, 5, -8), 100, 5, 8, 'sunset'), narrow: station(v(-3, 5, -8), 104, 5, 8, 'sunset') };
function frameHero() {
  const h = mobileQuery.matches ? HERO.narrow : HERO.wide;
  STATIONS.hero.pos.copy(h.pos);
  STATIONS.hero.look.copy(h.look);
}

function start(renderer) {
  // The 3D is drawn a little below full resolution; the text over it stays sharp.
  let dpr = Math.min(devicePixelRatio, 1.5);
  let aoAllowed = !LOW_POWER;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const palette = mixPalette(P(PALETTES.sunset), PALETTES.sunset, PALETTES.sunset, 0);
  scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 1200);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: palette.skyTop.clone() },
      bottom: { value: palette.skyBottom.clone() },
      sunDir: { value: palette.sunDir.clone() },
      sunColor: { value: palette.sun.clone() },
      glow: { value: 0 },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow;
      void main(){
        vec3 d = normalize(vP);
        float h = pow(smoothstep(0.0, 0.34, d.y), 0.8);
        vec3 col = mix(bottom, top, h);
        float s = max(dot(d, sunDir), 0.0);
        // A wide warm glow, a tighter halo and the disc itself.
        col += sunColor * glow * (0.18 * pow(s, 8.0) + 0.5 * pow(s, 90.0)) * (1.0 - h * 0.5);
        col += sunColor * glow * 8.0 * smoothstep(0.99982, 0.9999, s);
        // Below the horizon fades to the haze colour.
        col = mix(col, bottom, smoothstep(0.0, -0.2, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMat);
  sky.renderOrder = -2;
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(3200 * 3);
  for (let i = 0; i < 3200; i++) {
    const s = new THREE.Vector3().randomDirection();
    s.normalize().multiplyScalar(550);
    starPos.set([s.x, s.y, s.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.renderOrder = -1;
  scene.add(stars);

  const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemiI);
  const sun = new THREE.DirectionalLight(palette.sun, palette.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(LOW_POWER ? 1024 : 2048, LOW_POWER ? 1024 : 2048);
  // Shadows are redrawn every frame while the camera moves, and less often
  // when it rests (never on phones).
  sun.shadow.autoUpdate = false;
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 260 });
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 12;
  sun.shadow.bias = -0.0004;
  scene.add(hemi, sun, sun.target);

  // The sky also lights the scene: render it into an environment map that
  // follows the palette.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMat));
  let envRT = null;
  let envKey = '';
  function updateEnvironment(key) {
    if (key === envKey) return;
    envKey = key;
    const next = pmrem.fromScene(envScene, 0, 0.1, 100);
    scene.environment = next.texture;
    envRT?.dispose();
    envRT = next;
  }

  // Scenes are built one at a time: the one on screen first, so the page
  // shows something quickly, then the rest in the background, nearest first.
  // `from` and `to` are the chapters each scene belongs to.
  const pending = [
    { build: buildKaukira, x: X.kaukira, from: 0, to: idx.kaukira },
    { build: buildUniversity, x: X.university, from: idx.university, to: idx.university },
    { build: buildClassroom, x: X.classroom, from: idx.teacher, to: idx.teacher },
    { build: buildGlobe, x: X.globe, from: idx.remote, to: idx.move },
    { build: buildSweden, x: X.sweden, from: idx.sweden, to: idx.sweden },
    { build: buildTitan, x: X.titan, from: idx.titan, to: idx.titan },
    { build: buildNow, x: X.now, from: idx.now, to: idx.now },
  ];
  const worlds = [];
  // Some scenes show an HTML window (editor, terminal) that the camera places
  // over the canvas, so its text is drawn by the browser and stays sharp.
  const overlays = [];
  const measureOverlays = () => { for (const o of overlays) o.baseWidth = o.el.offsetWidth || 1; };
  // Globe labels as HTML over the scene.
  const labelsEl = document.getElementById('labels');
  const labels = [];
  const labelWindow = { sanPedroSula: ['remote', 'move'], usa: ['remote', 'remote'], goteborg: ['move', 'move'] };

  function buildNearest(position) {
    if (!pending.length) return false;
    const gap = (p) => Math.max(p.from - position, position - p.to, 0);
    pending.sort((p, q) => gap(p) - gap(q));
    const next = pending.shift();
    const t0 = performance.now();
    const w = next.build();
    w.group.position.x = next.x;
    w.group.visible = false;
    // A scene shows for its own chapters and half a transition either side;
    // the swap to the next scene happens where the haze is thickest.
    w.range = [next.from - 0.5, next.to + 0.5];
    scene.add(w.group);
    worlds.push(w);
    if (w.overlay) overlays.push({ ...w.overlay, baseWidth: w.overlay.el.offsetWidth || 1, shown: false });
    for (const [key, p] of Object.entries(w.pins || {})) {
      const el = document.createElement('div');
      el.className = 'pin-label';
      el.style.setProperty('--c', p.color);
      el.textContent = p.label;
      labelsEl.appendChild(el);
      labels.push({ key, p, el });
    }
    sun.shadow.needsUpdate = true;
    if (import.meta.env.DEV) console.log(`built ${next.build.name} in ${Math.round(performance.now() - t0)} ms`);
    return true;
  }
  buildNearest(scrollF());

  // Soft contact shadows where things meet (ambient occlusion), then the
  // tone mapping and colour conversion.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const plain = new RenderPass(scene, camera);
  composer.addPass(plain);
  const ao = new N8AOPass(scene, camera, 1, 1);
  ao.configuration.gammaCorrection = false;
  ao.configuration.aoRadius = 2.4;
  ao.configuration.distanceFalloff = 1;
  ao.configuration.intensity = 2.4;
  ao.configuration.halfRes = true;
  ao.setQualityMode('Performance');
  composer.addPass(ao);
  composer.addPass(new OutputPass());

  let W = 1, H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
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
    measureOverlays();
  }
  addEventListener('resize', resize);
  resize();
  document.fonts?.ready.then(measure);

  let f = scrollF();
  let t = 0;
  let last = performance.now();
  let slowFrames = 0;
  let frameNo = 0;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const world = new THREE.Vector3();
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
    if (rawDt > 0.022 && rawDt < 0.2) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40) {
      if (dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false);
        composer.setPixelRatio(dpr);
        composer.setSize(W, H);
      } else {
        aoAllowed = false; // last resort: drop the contact-shadow pass
      }
      slowFrames = 0;
    }

    t += dt * (reduceMotion ? 0.25 : 1);
    const target = scrollF();
    frameNo++;
    if (Math.abs(target - f) > 0.0005 || (!LOW_POWER && frameNo % 3 === 0)) sun.shadow.needsUpdate = true;
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
    skyMat.uniforms.sunDir.value.copy(palette.sunDir);
    skyMat.uniforms.sunColor.value.copy(palette.sun);
    skyMat.uniforms.glow.value = palette.glow;
    updateEnvironment(f.toFixed(2));
    scene.environmentIntensity = palette.env;
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
    sun.position.copy(look).addScaledVector(palette.sunDir, 120);
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    stars.material.opacity = palette.stars;

    const info = { f, idx, palette, pixelH: H * dpr };
    for (const w of worlds) {
      w.group.visible = f >= w.range[0] && f < w.range[1];
      if (w.group.visible) w.update(t, dt * (reduceMotion ? 0.25 : 1), info);
    }

    // HTML windows follow their anchor in the scene and fade with the chapter.
    camera.updateMatrixWorld();
    for (const o of overlays) {
      const k = 1 - smooth(0.22, 0.42, Math.abs(f - idx[o.station]));
      if (k <= 0.002) {
        if (o.shown) { o.shown = false; o.el.style.visibility = 'hidden'; }
        continue;
      }
      o.anchor.getWorldPosition(world);
      tmp.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(o.width / 2).add(world);
      world.project(camera);
      tmp.project(camera);
      // Phones centre the window; wide screens keep it where the scene puts it.
      const x = mobileQuery.matches ? W / 2 : (world.x * 0.5 + 0.5) * W, y = (-world.y * 0.5 + 0.5) * H;
      // On-screen width in CSS pixels, kept inside the screen edges.
      const px = Math.min(Math.abs(tmp.x - world.x) * W, 2 * (Math.min(x, W - x) - 12));
      o.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(px / o.baseWidth).toFixed(4)})`;
      o.el.style.opacity = k.toFixed(3);
      if (!o.shown) { o.shown = true; o.el.style.visibility = 'visible'; }
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

    // Contact shadows matter on the ground scenes, not on the globe or screens.
    // N8AO renders the scene itself; the plain pass is only for when it's off.
    ao.enabled = aoAllowed && (f < idx.remote - 0.5 || (f > idx.move + 0.5 && f < idx.titan - 0.5));
    plain.enabled = !ao.enabled;
    composer.render(dt);

    if (!started) {
      // The first picture is up: reveal it, then build the other scenes.
      started = true;
      document.documentElement.classList.add('ready');
      performance.mark('scene-ready');
      const more = () => { if (buildNearest(f)) setTimeout(more, 90); };
      setTimeout(more, 250);
    }
  }
  let started = false;
  if (import.meta.env.DEV) window.__dbg = { ao, plain, sun, renderer, composer, scene, setDpr: (d) => { dpr = d; renderer.setPixelRatio(d); renderer.setSize(W, H, false); composer.setPixelRatio(d); composer.setSize(W, H); } };
  sun.shadow.needsUpdate = true;
  requestAnimationFrame(frame);
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
